// 恒矽 AI 编程助手 —— PCB 布局引擎 + Gerber 工程文件生成器
// 布局引擎同时驱动页面 SVG 版图预览与 Gerber 导出，保证所见即所得。

export type PinInfo = { pin: string; func: string; note: string };

export type ConnSpec = {
  ref: string;
  label: string;
  kind: "terminal" | "header";
  pins: number;
};

export type PlacedConn = ConnSpec & {
  x: number; // mm，左上角
  y: number;
  w: number;
  h: number;
};

export type BoardLayout = {
  w: number; // mm
  h: number; // mm
  mcu: { name: string; x: number; y: number; size: number; pinsPerSide: number };
  crystal: { x: number; y: number };
  led: { x: number; y: number };
  connectors: PlacedConn[];
  holes: { x: number; y: number }[];
  traces: { x1: number; y1: number; x2: number; y2: number; x3?: number; y3?: number }[];
};

// ---------------- 外设 → 连接器映射 ----------------
const CONN_MAP: Record<string, Omit<ConnSpec, "ref">> = {
  "UART / RS485": { label: "RS485", kind: "terminal", pins: 3 },
  "UART / RS232": { label: "RS232", kind: "terminal", pins: 3 },
  "CAN / CAN-FD": { label: "CAN", kind: "terminal", pins: 2 },
  "I²C 传感器": { label: "I2C-SEN", kind: "header", pins: 4 },
  "SPI 显示屏": { label: "SPI-LCD", kind: "header", pins: 8 },
  "SPI Flash 存储": { label: "SPI-FLS", kind: "header", pins: 8 },
  "ADC 模拟采集": { label: "ADC-IN", kind: "terminal", pins: 4 },
  "DAC 模拟输出": { label: "DAC-OUT", kind: "terminal", pins: 2 },
  "PWM / 电机驱动": { label: "PWM", kind: "terminal", pins: 4 },
  "GPIO 按键 / LED": { label: "GPIO", kind: "header", pins: 6 },
  "继电器输出": { label: "RELAY", kind: "terminal", pins: 4 },
  "蜂鸣器": { label: "BUZZ", kind: "header", pins: 2 },
  "USB Device": { label: "USB", kind: "header", pins: 4 },
  "以太网": { label: "ETH", kind: "header", pins: 8 },
  "WiFi": { label: "WIFI", kind: "header", pins: 6 },
  "蓝牙 BLE": { label: "BLE", kind: "header", pins: 6 },
  "4G Cat.1": { label: "4G", kind: "header", pins: 8 },
  "LoRa 无线": { label: "LORA", kind: "header", pins: 6 },
  "北斗 / GPS": { label: "GPS", kind: "header", pins: 4 },
  "NFC": { label: "NFC", kind: "header", pins: 4 },
  "RTC 实时时钟": { label: "RTC", kind: "header", pins: 2 },
  "独立看门狗": { label: "WDT", kind: "header", pins: 2 },
  "EEPROM 存储": { label: "EEPROM", kind: "header", pins: 4 },
  "触摸按键": { label: "TOUCH", kind: "header", pins: 4 },
};

export const PERIPHERAL_OPTIONS = Object.keys(CONN_MAP);

// ---------------- 解析 AI 输出的引脚表 ----------------
export function parsePins(markdown: string): PinInfo[] {
  const out: PinInfo[] = [];
  for (const line of markdown.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const head = cells[0].toLowerCase();
    if (head.includes("---") || head.includes("引脚") || head === "pin") continue;
    out.push({
      pin: cells[0],
      func: cells[1] ?? "",
      note: cells[2] ?? cells[cells.length - 1] ?? "",
    });
  }
  return out;
}

// ---------------- 布局引擎 ----------------
export function layoutBoard(opts: {
  mcuName: string;
  pinCount: number;
  peripherals: string[];
}): BoardLayout {
  const conns: ConnSpec[] = [
    { ref: "J1", label: "DC-IN", kind: "terminal", pins: 2 },
    { ref: "J2", label: "SWD", kind: "header", pins: 4 },
    ...opts.peripherals
      .map((p, i) => {
        const spec = CONN_MAP[p];
        return spec ? { ref: `J${i + 3}`, ...spec } : null;
      })
      .filter((c): c is ConnSpec => c !== null),
  ];

  // 板尺寸随连接器数量自适应
  const cols = 2;
  const rows = Math.ceil(conns.length / cols);
  const h = Math.max(50, 16 + rows * 13);
  const w = Math.max(80, conns.length > 6 ? 96 : 84);

  // 连接器：右列 + 底部行
  const connectors: PlacedConn[] = [];
  let rx = w - 14;
  let ry = 8;
  let bx = 8;
  const by = h - 12;
  conns.forEach((c, i) => {
    const cw = c.kind === "terminal" ? c.pins * 4 + 4 : c.pins * 2.54 + 2.5;
    const ch = c.kind === "terminal" ? 8 : 5;
    if (i % 2 === 0 && ry + ch < by - 4) {
      connectors.push({ ...c, x: rx - cw / 2 + 3, y: ry, w: cw, h: ch });
      ry += 13;
    } else {
      connectors.push({ ...c, x: bx, y: by, w: cw, h: ch });
      bx += cw + 5;
      if (bx > w - 20) bx = 8;
    }
  });

  const mcuSize = 12;
  const mcu = {
    name: opts.mcuName,
    x: w * 0.32,
    y: h * 0.42,
    size: mcuSize,
    pinsPerSide: Math.min(12, Math.max(6, Math.ceil(opts.pinCount / 4))),
  };
  const crystal = { x: mcu.x - 3, y: mcu.y + mcuSize + 5 };
  const led = { x: mcu.x + mcuSize + 8, y: mcu.y - 8 };

  // 走线：连接器 → MCU（L 形两 segment）
  const mcx = mcu.x + mcuSize / 2;
  const mcy = mcu.y + mcuSize / 2;
  const traces = connectors.map((c) => {
    const cx = c.x + c.w / 2;
    const cy = c.y + c.h / 2;
    return { x1: cx, y1: cy, x2: cx, y2: mcy, x3: mcx, y3: mcy };
  });

  return {
    w,
    h,
    mcu,
    crystal,
    led,
    connectors,
    holes: [
      { x: 3.5, y: 3.5 },
      { x: w - 3.5, y: 3.5 },
      { x: 3.5, y: h - 3.5 },
      { x: w - 3.5, y: h - 3.5 },
    ],
    traces,
  };
}

// ---------------- Gerber (RS-274X) 生成 ----------------
const g = (n: number) =>
  Math.round(n * 1e6)
    .toString()
    .padStart(9, "0");
const X = (n: number) => `X${g(n)}`;
const Y = (n: number) => `Y${g(n)}`;

function gerberHeader(comment: string): string[] {
  return [
    `G04 ${comment} *`,
    "G04 恒矽传感 AI 编程助手生成 *",
    "%FSLAX36Y36*%",
    "%MOMM*%",
    "%LPD*%",
  ];
}

function flash(lines: string[], d: number, x: number, y: number) {
  lines.push(`D${d}*`, `${X(x)}${Y(y)}D03*`);
}

function draw(
  lines: string[],
  d: number,
  pts: [number, number][],
) {
  lines.push(`D${d}*`, `${X(pts[0][0])}${Y(pts[0][1])}D02*`);
  for (const [px, py] of pts.slice(1)) lines.push(`${X(px)}${Y(py)}D01*`);
}

export function buildGerberFiles(layout: BoardLayout): Record<string, string> {
  const { w, h, mcu, connectors, holes, traces } = layout;
  const files: Record<string, string> = {};

  // ---- 顶层铜 F.Cu ----
  {
    const L = gerberHeader("SensorHX F.Cu Top Copper");
    L.push(
      "%ADD10C,0.250000*%", // 走线
      "%ADD11R,0.900000X0.350000*%", // MCU SMD 焊盘（横）
      "%ADD12R,0.350000X0.900000*%", // MCU SMD 焊盘（竖）
      "%ADD13C,1.700000*%", // 连接器 PTH 焊盘
    );
    // MCU 四边焊盘
    const half = mcu.size / 2;
    for (let i = 0; i < mcu.pinsPerSide; i++) {
      const o = -half + 1 + (i * (mcu.size - 2)) / Math.max(1, mcu.pinsPerSide - 1);
      flash(L, 12, mcu.x + o, mcu.y - half - 0.55); // 上
      flash(L, 12, mcu.x + o, mcu.y + half + 0.55); // 下
      flash(L, 11, mcu.x - half - 0.55, mcu.y + o); // 左
      flash(L, 11, mcu.x + half + 0.55, mcu.y + o); // 右
    }
    // 连接器焊盘 + 走线
    connectors.forEach((c, idx) => {
      for (let p = 0; p < c.pins; p++) {
        const px = c.x + 1.5 + p * (c.kind === "terminal" ? 4 : 2.54);
        flash(L, 13, px, c.y + c.h / 2);
      }
      const t = traces[idx];
      if (t) draw(L, 10, [[t.x1, t.y1], [t.x2, t.y2], [t.x3!, t.y3!]]);
    });
    L.push("M02*");
    files["HX-Assistant-F_Cu.gtl"] = L.join("\n");
  }

  // ---- 底层铜 B.Cu ----
  {
    const L = gerberHeader("SensorHX B.Cu Bottom Copper");
    L.push("%ADD10C,0.300000*%", "%ADD13C,1.700000*%");
    connectors.forEach((c) => {
      for (let p = 0; p < c.pins; p++) {
        const px = c.x + 1.5 + p * (c.kind === "terminal" ? 4 : 2.54);
        flash(L, 13, px, c.y + c.h / 2);
      }
    });
    // 底层地线骨架
    for (let x = 10; x < w - 10; x += 12) draw(L, 10, [[x, 4], [x, h - 4]]);
    L.push("M02*");
    files["HX-Assistant-B_Cu.gbl"] = L.join("\n");
  }

  // ---- 阻焊 F/B Mask ----
  for (const [name, cmt] of [
    ["HX-Assistant-F_Mask.gts", "F.Mask"],
    ["HX-Assistant-B_Mask.gbs", "B.Mask"],
  ] as const) {
    const L = gerberHeader(`SensorHX ${cmt} Solder Mask`);
    L.push("%ADD13C,2.000000*%", "%ADD14R,1.100000X0.550000*%");
    if (name.includes("F_Mask")) {
      const half = mcu.size / 2;
      for (let i = 0; i < mcu.pinsPerSide; i++) {
        const o = -half + 1 + (i * (mcu.size - 2)) / Math.max(1, mcu.pinsPerSide - 1);
        flash(L, 14, mcu.x + o, mcu.y - half - 0.55);
        flash(L, 14, mcu.x + o, mcu.y + half + 0.55);
      }
    }
    connectors.forEach((c) => {
      for (let p = 0; p < c.pins; p++) {
        const px = c.x + 1.5 + p * (c.kind === "terminal" ? 4 : 2.54);
        flash(L, 13, px, c.y + c.h / 2);
      }
    });
    L.push("M02*");
    files[name] = L.join("\n");
  }

  // ---- 顶层丝印 F.Silk ----
  {
    const L = gerberHeader("SensorHX F.SilkS Top Silkscreen");
    L.push("%ADD10C,0.150000*%");
    // MCU 丝印框
    const half = mcu.size / 2 + 1;
    draw(L, 10, [
      [mcu.x - half, mcu.y - half],
      [mcu.x + half, mcu.y - half],
      [mcu.x + half, mcu.y + half],
      [mcu.x - half, mcu.y + half],
      [mcu.x - half, mcu.y - half],
    ]);
    // 连接器丝印框
    connectors.forEach((c) => {
      draw(L, 10, [
        [c.x - 0.8, c.y - 0.8],
        [c.x + c.w + 0.8, c.y - 0.8],
        [c.x + c.w + 0.8, c.y + c.h + 0.8],
        [c.x - 0.8, c.y + c.h + 0.8],
        [c.x - 0.8, c.y - 0.8],
      ]);
    });
    L.push("M02*");
    files["HX-Assistant-F_SilkS.gto"] = L.join("\n");
  }

  // ---- 板框 Edge.Cuts ----
  {
    const L = gerberHeader("SensorHX Edge.Cuts Board Outline");
    L.push("%ADD10C,0.100000*%");
    draw(L, 10, [[0, 0], [w, 0], [w, h], [0, h], [0, 0]]);
    L.push("M02*");
    files["HX-Assistant-Edge_Cuts.gko"] = L.join("\n");
  }

  // ---- 钻孔 Excellon ----
  {
    const L = [
      "M48",
      "; SensorHX PTH Drill - 恒矽 AI 编程助手",
      "METRIC,TZ",
      "T1C1.000",
      "T2C3.200",
      "%",
      "T1",
    ];
    connectors.forEach((c) => {
      for (let p = 0; p < c.pins; p++) {
        const px = c.x + 1.5 + p * (c.kind === "terminal" ? 4 : 2.54);
        L.push(`X${px.toFixed(3)}Y${(c.y + c.h / 2).toFixed(3)}`);
      }
    });
    L.push("T2");
    holes.forEach((hl) => L.push(`X${hl.x.toFixed(3)}Y${hl.y.toFixed(3)}`));
    L.push("M30");
    files["HX-Assistant-PTH.drl"] = L.join("\n");
  }

  return files;
}

// ---------------- 打包下载 ----------------
export async function downloadGerberZip(opts: {
  layout: BoardLayout;
  mcuLabel: string;
  pins: PinInfo[];
  bom: string;
}) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const files = buildGerberFiles(opts.layout);
  for (const [name, content] of Object.entries(files)) zip.file(name, content);

  const pinsCsv =
    "引脚,功能,备注\n" +
    opts.pins.map((p) => `${p.pin},${p.func},${p.note.replaceAll(",", "，")}`).join("\n");
  zip.file("引脚分配表.csv", "﻿" + pinsCsv);
  if (opts.bom) zip.file("物料清单.md", opts.bom);
  zip.file(
    "README.md",
    [
      "# Gerber 工程包 — 恒矽 AI 编程助手",
      "",
      `- 目标 MCU：${opts.mcuLabel}`,
      `- 板尺寸：${opts.layout.w}mm × ${opts.layout.h}mm（2 层板）`,
      `- 生成时间：${new Date().toLocaleString("zh-CN")}`,
      "",
      "## 文件说明",
      "| 文件 | 层 |",
      "|---|---|",
      "| *_F_Cu.gtl | 顶层铜 |",
      "| *_B_Cu.gbl | 底层铜 |",
      "| *_F_Mask.gts | 顶层阻焊 |",
      "| *_B_Mask.gbs | 底层阻焊 |",
      "| *_F_SilkS.gto | 顶层丝印 |",
      "| *_Edge_Cuts.gko | 板框 |",
      "| *_PTH.drl | 金属化钻孔 |",
      "",
      "可直接上传嘉立创 / 捷配等打板平台（工艺：2 层 1.6mm FR-4 有铅喷锡）。",
      "注意：本工程为 AI 布局参考，量产前请由硬件工程师复核原理图与 DRC。",
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gerber-${opts.layout.mcu.name}-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
