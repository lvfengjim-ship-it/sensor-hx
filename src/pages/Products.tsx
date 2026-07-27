import { useState } from "react";
import { FileText, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/lib/auth";
import { asset } from "@/lib/asset";

type SpecTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

type Product = {
  model: string;
  name: string;
  image: string;
  category: string;
  desc: string;
  specs: { label: string; value: string }[];
  tags: string[];
  status: "量产" | "样品" | "预告";
  highlights?: string[];
  tables?: SpecTable[];
};

const products: Product[] = [
  // ================= MCU 主控 =================
  {
    model: "HXM-32F4",
    name: "32 位工业控制 MCU",
    image: asset("images/product-mcu.png"),
    category: "mcu",
    desc: "ARM Cortex-M4 内核 168MHz，集成 3 路 CAN-FD 与 12 位 ADC，针对传感网关与电机控制优化。",
    specs: [
      { label: "内核", value: "Cortex-M4F 168MHz" },
      { label: "Flash/RAM", value: "1MB / 256KB" },
      { label: "通信", value: "CAN-FD×3, UART×6, SPI×4" },
      { label: "工作温度", value: "-40℃ ~ +105℃" },
    ],
    tags: ["国产替代", "开发板现货", "免费 SDK"],
    status: "量产",
  },
  {
    model: "HXM-32U0",
    name: "超低功耗传感节点 MCU",
    image: asset("images/product-mcu.png"),
    category: "mcu",
    desc: "Cortex-M0+ 内核，待机电流 0.8μA，集成 16 位 ADC 与触摸按键，电池供电传感节点首选。",
    specs: [
      { label: "内核", value: "Cortex-M0+ 48MHz" },
      { label: "待机电流", value: "0.8μA（RTC 运行）" },
      { label: "ADC", value: "16 位 Σ-Δ" },
      { label: "封装", value: "QFN32 / LQFP48" },
    ],
    tags: ["超低功耗", "即将上市"],
    status: "预告",
  },
  // ================= 漏电保护芯片 =================
  {
    model: "HS54123A",
    name: "漏电保护开关主控芯片",
    image: asset("images/product-rcd.png"),
    category: "rcd",
    desc: "高性能 AC 型漏电保护专用芯片，内部集成稳压电源、放大电路、比较电路、跳闸控制器与跳闸驱动电路，外部仅需零序电流互感器及少量阻容器件。当 OP1/OP2 间漏电信号峰值超过 4.9mV 时，OS 引脚输出最小 20ms 高电平脉冲，直接驱动外部可控硅导通。",
    specs: [
      { label: "动作灵敏度", value: "4.9mV（典型值）" },
      { label: "静态电流", value: "190μA" },
      { label: "工作电压", value: "3V ~ 5.5V" },
      { label: "交流输入", value: "50V ~ 380V（50/60Hz）" },
      { label: "工作温度", value: "-40℃ ~ +105℃" },
      { label: "封装", value: "SOP8L（4000/盘）" },
    ],
    tags: ["漏电断路器", "漏电继电器", "RoHS & HF", "MSL-3"],
    status: "量产",
    highlights: [
      "适用于检测 AC 型漏电信号",
      "输入灵敏度高（典型值 4.9mV）",
      "190μA 低静态电流",
      "直接驱动 SCR，输出脉宽＞20ms",
      "漏电检测阈值一致性好",
      "良好的电磁干扰（EMC）防护能力",
    ],
    tables: [
      {
        title: "关键电性参数（VDD=4.5V，TA=25℃）",
        columns: ["参数", "最小", "典型", "最大", "单位"],
        rows: [
          ["静态电流 IQ", "100", "190", "280", "μA"],
          ["电源电压 VDD", "4.6", "4.8", "5.0", "V"],
          ["正动作电压 V_PT", "4.4", "4.9", "5.5", "mV"],
          ["负动作电压 V_NT", "4.4", "4.9", "5.5", "mV"],
          ["锁存时间 TON", "20", "—", "—", "ms"],
          ["OS 输出高电流 I_OSH", "0.18", "0.23", "0.28", "mA"],
        ],
      },
      {
        title: "引脚描述（SOP8L）",
        columns: ["编号", "名称", "功能"],
        rows: [
          ["1", "OP1", "信号放大器输入端 1"],
          ["2", "OP2", "信号放大器输入端 2"],
          ["3", "GND", "地"],
          ["4", "NC", "无连接"],
          ["5", "OUT", "放大器输出，外接滤波电容"],
          ["6", "CAP", "延时设置，外接电容"],
          ["7", "OS", "输出控制可控硅"],
          ["8", "VDD", "电源"],
        ],
      },
    ],
  },
  {
    model: "CN5412x 系列",
    name: "漏电保护芯片系列选型",
    image: asset("images/product-rcd.png"),
    category: "rcd",
    desc: "覆盖 AC 型与 A 型漏电检测的完整产品家族，动作电压一致性优异，具备 VDD 钳位与 EMC 防护，适配漏电断路器、漏电继电器等不同结构需求。",
    specs: [
      { label: "检测类型", value: "AC 型 / A 型" },
      { label: "工作电压", value: "2.7V ~ 5.5V" },
      { label: "静态电流", value: "150μA ~ 190μA" },
      { label: "工作温度", value: "-40℃ ~ +105℃" },
    ],
    tags: ["VDD 钳位", "EMC 防护", "多封装可选"],
    status: "量产",
    tables: [
      {
        title: "漏电保护芯片系列选型表",
        columns: ["型号", "类型", "工作电压(V)", "静态电流(μA)", "动作电压", "封装"],
        rows: [
          ["CN54123A/B/C/D", "AC 型", "3 ~ 5.5", "190", "VPT=VNT=4.95mV", "SOP8"],
          ["CN54124A/B/C/D", "A 型 / AC 型", "3 ~ 5.5", "190", "VPT=VNT=4.95mV", "SOP8 / SOP14"],
          ["CN54125A/B/C/D", "AC 型", "2.7 ~ 5.5", "150", "VPT=VNT=5mV", "SOP8"],
          ["CN54126A/B/C/D", "A 型 / AC 型", "2.7 ~ 5.5", "150", "VPT=VNT=5mV", "SOP8 / SOP14"],
          ["CN54127A/B/C/D", "AC 型", "2.7 ~ 5.5", "150", "VPT=VNT=5mV", "SOT23-5"],
        ],
      },
    ],
  },
  // ================= 电源管理芯片 =================
  {
    model: "CN11015A",
    name: "SSR 隔离反激式 AC-DC 电源芯片",
    image: asset("images/product-power.png"),
    category: "power",
    desc: "副边反馈（SSR）隔离反激控制器，900V 耐压内置功率开关，待机功耗低至 50mW，保护功能完善，适用于智能电表、家电辅助电源与工业控制电源。",
    specs: [
      { label: "开关耐压", value: "900V" },
      { label: "输出功率", value: "18W（开放式）" },
      { label: "开关频率", value: "60kHz" },
      { label: "待机功耗", value: "50mW" },
      { label: "工作温度", value: "-40℃ ~ +105℃" },
      { label: "封装", value: "DIP-7" },
    ],
    tags: ["过载保护", "过温保护", "输出短路保护", "VDD 过/欠压保护"],
    status: "量产",
    tables: [
      {
        title: "AC-DC 电源芯片选型（部分）",
        columns: ["型号", "类别", "耐压(V)", "最大输出功率(W)", "封装"],
        rows: [
          ["CN1609", "PSR", "850", "3 ~ 5", "SOP-7"],
          ["CN1611", "PSR", "1000", "15", "DIP-7"],
          ["CN1812", "PSR", "650", "12", "SOP-7"],
          ["CN1810", "PSR（外置 MOS）", "—", "30", "SOT23-6"],
          ["CN11015A", "SSR", "900", "18（开放式）", "DIP-7"],
          ["CN1102AC", "SSR", "1000", "13（开放式）", "DIP-7"],
          ["CN1103AC", "SSR", "1200", "13（开放式）", "DIP-7"],
          ["CN1104BA", "SSR", "1500", "12（开放式）", "DIP-7"],
          ["CN1001A", "SSR（外置 MOS）", "—", "45", "SOP-8"],
          ["CN1303A", "非隔离", "1200", "7", "DIP-7"],
        ],
      },
    ],
  },
  {
    model: "CN2204",
    name: "同步降压 DC-DC 转换器",
    image: asset("images/product-power.png"),
    category: "power",
    desc: "5.5~38V 宽输入同步整流降压转换器，1A 输出能力，600kHz 开关频率，具备输入欠压/过压、输出短路、过热与 Hic-cup 模式保护，面向工业总线供电与宽压输入场景。",
    specs: [
      { label: "输入电压", value: "5.5V ~ 38V" },
      { label: "输出电流", value: "1A" },
      { label: "开关频率", value: "600kHz" },
      { label: "待机电流", value: "50μA" },
      { label: "工作温度", value: "-40℃ ~ +105℃" },
      { label: "封装", value: "SOT23-6" },
    ],
    tags: ["输入欠压/过压保护", "Hic-cup 模式", "FB 对地短路保护"],
    status: "量产",
    tables: [
      {
        title: "DC-DC 电源芯片选型（部分）",
        columns: ["型号", "类别", "输入(V)", "输出能力", "封装"],
        rows: [
          ["CN2501", "同步降压", "2.6 ~ 6", "1.4A", "SOT23-5"],
          ["CN2202", "同步降压", "4.5 ~ 18", "2A", "SOT23-6"],
          ["CN2203", "同步降压", "3.8 ~ 24", "0.85A", "SOT23-6"],
          ["CN2204", "同步降压", "5.5 ~ 38", "1A", "SOT23-6"],
          ["CN2213", "同步降压", "5.5 ~ 24", "固定 5V 输出", "SOT23-6"],
          ["CN2901", "升压", "2.4 ~ 6", "12V / 3.5A", "SOT23-6"],
          ["CN2902", "同步升压", "2.4 ~ 6", "24V / 3.5A", "ESOP-8"],
          ["CN35K180", "隔离（原边 H 桥）", "4 ~ 24", "3W", "SOT23-6"],
          ["CN3501BTER", "隔离（推挽驱动）", "2.8 ~ 6", "2W", "SOT23-6"],
        ],
      },
    ],
  },
  {
    model: "CN84AXXX",
    name: "低压差 LDO 稳压器系列",
    image: asset("images/product-power.png"),
    category: "power",
    desc: "覆盖 0.15A~1A 输出电流的 LDO 产品家族，低静态电流、±2% 输出精度，多种固定输出电压与封装可选，为 MCU、传感器与通信模组提供干净的电源轨。",
    specs: [
      { label: "输入电压", value: "VOUT+1 ~ 12V" },
      { label: "输出电流", value: "1A（CN84A 系列）" },
      { label: "静态电流", value: "≤ 2.5μA" },
      { label: "输出精度", value: "±2%" },
      { label: "工作温度", value: "-40℃ ~ +105℃" },
      { label: "封装", value: "SOT23-5 / SOT89-3 / TO-252 等" },
    ],
    tags: ["输出短路保护", "过热保护", "多电压档可选"],
    status: "量产",
    tables: [
      {
        title: "LDO / 稳压芯片选型（部分）",
        columns: ["型号", "输入(V)", "输出电流(A)", "静态电流(μA)", "固定输出(V)"],
        rows: [
          ["CN84MXXX", "VOUT+1 ~ 12", "0.5", "≤2.5", "1.8 / 2.8 / 3.0 / 3.3 / 3.6 / 4.0 / 5.0"],
          ["CN84AXXX", "VOUT+1 ~ 12", "1", "≤2.5", "1.8 / 2.8 / 3.0 / 3.3 / 3.6 / 4.0 / 5.0"],
          ["CN85LXXX", "VOUT+1 ~ 20", "0.3", "≤2.5", "1.8 / 2.8 / 3.0 / 3.3 / 3.6 / 4.0 / 5.0"],
          ["CN86LXXX", "VOUT+1 ~ 36", "0.3", "≤1.2", "2.8 / 3.0 / 3.3 / 3.6 / 4.0 / 5.0 / 5.6 / 12"],
          ["CN87MXXX", "VOUT+1 ~ 6", "0.5", "≤0.6", "1.2 / 1.8 / 2.5 / 2.8 / 3.0 / 3.3 / 3.6 / 4.0 / 5.0"],
          ["CN88LXXX", "VOUT+1 ~ 35", "0.15", "≤6", "2.5 / 3.3 / 4.0 / 5.0 / 5.6"],
          ["CN78L05", "8 ~ 36", "0.1", "3000", "5（三端稳压）"],
        ],
      },
    ],
  },
  // ================= 电力物联模组 =================
  {
    model: "CN8513",
    name: "HPLC + HRF 双模电力载波通信芯片",
    image: asset("images/product-iot.png"),
    category: "iot",
    desc: "面向智能电表与用电信息采集系统的双模通信 SoC，HPLC 电力线载波与 HRF 微功率无线互为备份，15 级路由中继，单网络支持 1024 个从节点，满足国网互联互通标准。",
    specs: [
      { label: "HPLC 频段", value: "0.7 ~ 12MHz" },
      { label: "HRF 频段", value: "470 ~ 510MHz" },
      { label: "路由中继", value: "15 级" },
      { label: "从节点数量", value: "1024 个" },
      { label: "静态功耗", value: "＜210mW" },
      { label: "封装", value: "QFN68 / QFN88" },
    ],
    tags: ["国网互联互通", "双模备份", "智能电表", "集中器/采集器"],
    status: "量产",
    tables: [
      {
        title: "电力线载波通信芯片选型",
        columns: ["型号", "通信类型", "调制方式", "从节点", "标准支持", "封装"],
        rows: [
          ["CN8513", "双模通信", "HPLC + HRF", "1024", "国网互联互通", "QFN68"],
          ["CN8514", "双模通信", "HPLC + HRF", "1024", "国网互联互通", "QFN88"],
          ["CN8513B", "单模通信", "HPLC", "1024", "国网 / 南网互联互通", "QFN68"],
          ["CN8514B", "单模通信", "HPLC", "1024", "国网 / 南网互联互通", "QFN88"],
        ],
      },
    ],
  },
  {
    model: "CN8913",
    name: "HPLC 专用电源管理芯片（PMU）",
    image: asset("images/product-iot.png"),
    category: "iot",
    desc: "为载波通信模组量身定制的一体化 PMU：同步降压 800mA@3.3V 供给主芯片，升压 0.45A@12V 驱动线驱动器，并集成 2.55V 超级电容充电管理，保障掉电时刻的数据上报。",
    specs: [
      { label: "输入电压", value: "5V ~ 38V" },
      { label: "Buck 输出", value: "800mA @ 3.3V" },
      { label: "Boost 输出", value: "0.45A @ 12V" },
      { label: "超级电容充电", value: "2.55V（适配 2.7V 电容）" },
      { label: "待机电流", value: "465μA" },
      { label: "封装", value: "ESOP-8 / DFN3×3-10" },
    ],
    tags: ["输入欠压/过压保护", "Hic-cup 模式", "过热保护"],
    status: "量产",
    tables: [
      {
        title: "HPLC 专用 PMU 选型",
        columns: ["型号", "输入(V)", "Buck 输出", "Boost 输出", "封装"],
        rows: [
          ["CN8911B", "6.5 ~ 24", "500mA @ 3.3V", "300mA @ 12V", "QFN4×4-16"],
          ["CN8913", "5 ~ 38", "800mA @ 3.3V", "0.45A @ 12V", "ESOP-8 / DFN3×3-10"],
          ["CN8914", "5 ~ 38", "800mA @ 3.3V", "0.45A @ 12V（带使能端）", "ESOP-8 / DFN3×3-10"],
        ],
      },
    ],
  },
  {
    model: "CN6218",
    name: "电力线驱动与接口配套芯片",
    image: asset("images/product-iot.png"),
    category: "iot",
    desc: "集成 PMU 的大带宽线驱动器，将载波信号高效注入电力线；配套 CN71102 过零检测芯片与国网认证 RS485 收发器，构成电力物联终端的完整通信接口方案。",
    specs: [
      { label: "大信号带宽", value: "＞50MHz" },
      { label: "输出电流", value: "≤ 1A" },
      { label: "输出摆幅", value: "＞ ±8V" },
      { label: "ESD 防护", value: "HBM 2kV" },
      { label: "工作温度", value: "-40℃ ~ +105℃" },
      { label: "封装", value: "QFN5×4-24L" },
    ],
    tags: ["线驱动", "过零检测", "RS485 国网认证"],
    status: "量产",
    tables: [
      {
        title: "通信接口配套芯片选型",
        columns: ["型号", "类别", "关键参数", "封装"],
        rows: [
          ["CN6212", "线驱动器", "带宽＞20MHz，工作电压 6~28V，HBM 4kV", "QFN5×4-24L / QFN4×4-16L"],
          ["CN6222", "线驱动器", "带宽＞50MHz，工作电压 6~40V", "QFN5×4-24L"],
          ["CN6218", "PMU + 线驱动", "带宽＞50MHz，PMU 5~38V 输入", "QFN5×4-24L"],
          ["CN71102", "过零检测芯片", "静态电流 ≤1μA，3~5.5V", "SOT23-3"],
          ["RS485", "485 收发器", "500Kbps，A/B ±15kV ESD，国网认证", "SOP8"],
        ],
      },
    ],
  },
  // ================= 标准传感器产品（仅在「全部标准产品」展示） =================
  {
    model: "HXP-2100",
    name: "工业压力变送器芯体",
    image: asset("images/product-pressure.png"),
    category: "pressure",
    desc: "扩散硅压阻式压力敏感芯体，专为工业过程控制与液压系统设计，长期稳定性优异。",
    specs: [
      { label: "量程", value: "0~100 kPa … 60 MPa" },
      { label: "精度", value: "±0.25% FS" },
      { label: "输出", value: "4-20mA / 0-5V / I²C" },
      { label: "工作温度", value: "-40℃ ~ +125℃" },
    ],
    tags: ["AEC-Q100", "本安防爆", "OEM 定制"],
    status: "量产",
  },
  {
    model: "HXT-880",
    name: "数字温湿度传感器",
    image: asset("images/product-temp.png"),
    category: "temperature",
    desc: "CMOSens® 工艺单芯片温湿度一体传感器，出厂全量程标定，I²C 接口即插即用。",
    specs: [
      { label: "湿度精度", value: "±2% RH" },
      { label: "温度精度", value: "±0.3℃" },
      { label: "接口", value: "I²C，地址可选" },
      { label: "封装", value: "DFN-8 3×3mm" },
    ],
    tags: ["低功耗", "免标定", "卷带包装"],
    status: "量产",
  },
  {
    model: "HXC-500",
    name: "霍尔电流传感器",
    image: asset("images/product-current.png"),
    category: "current",
    desc: "开环霍尔原理，原边铜排穿孔设计，适用于变频器、光伏逆变器与充电桩电流检测。",
    specs: [
      { label: "量程", value: "±50A … ±500A" },
      { label: "精度", value: "±1.0%" },
      { label: "带宽", value: "DC ~ 100kHz" },
      { label: "供电", value: "±12V … ±15V" },
    ],
    tags: ["隔离测量", "高性价比"],
    status: "量产",
  },
];

const categories = [
  { key: "all", label: "全部标准产品" },
  { key: "mcu", label: "MCU 主控" },
  { key: "rcd", label: "漏电保护芯片" },
  { key: "power", label: "电源管理芯片" },
  { key: "iot", label: "电力物联模组" },
];

export default function Products() {
  const [category, setCategory] = useState("all");
  const [inquiryProduct, setInquiryProduct] = useState<Product | null>(null);
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const { member } = useAuth();

  const inquire = trpc.member.inquire.useMutation({
    onSuccess: () => {
      toast.success("已收到你的需求，销售工程师将尽快联系你");
      setInquiryProduct(null);
      setContact("");
      setMessage("");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered =
    category === "all"
      ? products
      : products.filter((p) => p.category === category);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      {/* 页头 */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">产品中心</h1>
        <p className="text-slate-400 max-w-2xl">
          标准传感器、MCU 主控与芯片产品线，覆盖漏电保护、电源管理与电力物联等应用场景，提供完整数据手册、参考设计与样品支持。点击「索取资料
          / 询价」获取报价与技术文档。
        </p>
      </div>

      {/* 分类 */}
      <Tabs value={category} onValueChange={setCategory} className="mb-8">
        <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto">
          {categories.map((c) => (
            <TabsTrigger
              key={c.key}
              value={c.key}
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* 产品网格 */}
      <div className="grid gap-6 md:grid-cols-2">
        {filtered.map((p) => (
          <Card
            key={p.model}
            className={`bg-slate-900/60 border-slate-800 overflow-hidden hover:border-cyan-500/40 transition-colors ${
              p.tables ? "md:col-span-2" : ""
            }`}
          >
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-44 h-44 sm:h-auto shrink-0 bg-slate-800">
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardContent className="p-5 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-cyan-400">
                    {p.model}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      p.status === "量产"
                        ? "border-emerald-500/40 text-emerald-400"
                        : p.status === "样品"
                          ? "border-amber-500/40 text-amber-400"
                          : "border-slate-500/40 text-slate-400"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
                <h3 className="font-bold text-lg mb-2">{p.name}</h3>
                <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                  {p.desc}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
                  {p.specs.map((s) => (
                    <div key={s.label} className="text-xs">
                      <span className="text-slate-500">{s.label}：</span>
                      <span className="text-slate-300">{s.value}</span>
                    </div>
                  ))}
                </div>
                {p.highlights && (
                  <div className="mb-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-xs text-slate-500 mb-2">产品特性</div>
                    <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                      {p.highlights.map((h) => (
                        <li
                          key={h}
                          className="text-xs text-slate-300 flex items-start gap-1.5"
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-500"
                    onClick={() => {
                      setInquiryProduct(p);
                      setContact(member ? `${member.name} ${member.phone}` : "");
                    }}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" /> 索取资料 / 询价
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                    onClick={() =>
                      toast.info("数据手册将在询价确认后发送至你的邮箱")
                    }
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> 数据手册
                  </Button>
                </div>
              </CardContent>
            </div>
            {p.tables && (
              <div className="border-t border-slate-800 px-5 py-4 grid gap-4 lg:grid-cols-2">
                {p.tables.map((t) => (
                  <div
                    key={t.title}
                    className={p.tables!.length === 1 ? "lg:col-span-2" : ""}
                  >
                    <div className="text-xs font-semibold text-slate-300 mb-2">
                      {t.title}
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-800/60 text-slate-400">
                            {t.columns.map((c) => (
                              <th
                                key={c}
                                className="px-3 py-2 text-left font-medium whitespace-nowrap"
                              >
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {t.rows.map((r, i) => (
                            <tr
                              key={i}
                              className="border-t border-slate-800/60 text-slate-300"
                            >
                              {r.map((cell, j) => (
                                <td
                                  key={j}
                                  className={`px-3 py-1.5 whitespace-nowrap ${
                                    j === 0 ? "font-mono text-cyan-300" : ""
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* 定制服务 */}
      <div className="mt-14 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <FileText className="h-7 w-7 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">没有找到合适的型号？</h3>
          <p className="text-sm text-slate-400">
            我们提供传感器与芯片的定制开发、国产替代选型服务，告诉我们你的应用场景与指标要求，2
            个工作日内给出方案建议。
          </p>
        </div>
        <Button
          className="bg-cyan-600 hover:bg-cyan-500 shrink-0"
          onClick={() => {
            setInquiryProduct({
              model: "CUSTOM",
              name: "定制需求咨询",
              image: "",
              category: "",
              desc: "",
              specs: [],
              tags: [],
              status: "量产",
            });
            setContact(member ? `${member.name} ${member.phone}` : "");
          }}
        >
          提交定制需求
        </Button>
      </div>

      {/* 询价对话框 */}
      <Dialog
        open={!!inquiryProduct}
        onOpenChange={(v) => !v && setInquiryProduct(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>索取资料 / 询价</DialogTitle>
            <DialogDescription className="text-slate-400">
              {inquiryProduct?.model} {inquiryProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="contact">联系方式（手机或邮箱）*</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="便于工程师联系你"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">需求说明</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="应用场景、目标参数、预计用量…"
                rows={4}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500"
              disabled={!contact || inquire.isPending}
              onClick={() =>
                inquiryProduct &&
                inquire.mutate({
                  productName: `${inquiryProduct.model} ${inquiryProduct.name}`,
                  contact,
                  message,
                })
              }
            >
              {inquire.isPending ? "提交中…" : "提交需求"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
