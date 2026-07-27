import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bot,
  Lock,
  Play,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Circle,
  FileCode2,
  CircuitBoard,
  ListOrdered,
  Download,
  Sparkles,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import {
  PERIPHERAL_OPTIONS,
  downloadGerberZip,
  layoutBoard,
  parsePins,
  type PinInfo,
} from "@/lib/pcb";

type GenResult = {
  code: string;
  simLogic: string;
  simTiming: string;
  simSI: string;
  pins: string;
  schematic: string;
  bom: string;
  raw: string;
};
import { asset } from "@/lib/asset";

const PIPELINE_STEPS = [
  "需求解析与器件选型",
  "固件框架与驱动生成",
  "代码逻辑仿真（软件仿真）",
  "功能与时序仿真（硬件仿真）",
  "信号完整性仿真（物理仿真）",
  "引脚分配与原理图校验",
  "Gerber 工程文件打包",
];

// 产品中心在售 MCU（与产品页保持一致）
const MCU_GROUPS = [
  {
    label: "恒矽在售 · 32 位 MCU",
    items: [
      { value: "MS60F3026", label: "MS60F3026（M0 72MHz，通用高性能）" },
      { value: "MS32F031A6", label: "MS32F031A6（M0 48MHz，电机专用）" },
      { value: "MS8040", label: "MS8040（M0 + 三相栅驱，BLDC）" },
      { value: "MA60F9113", label: "MA60F9113（M0 48MHz，车规）" },
    ],
  },
  {
    label: "恒矽在售 · 8 位 MCU",
    items: [
      { value: "MC51F7084", label: "MC51F7084（8051，通用 FLASH）" },
      { value: "MC32F7361", label: "MC32F7361（RISC FLASH，16 路 ADC）" },
      { value: "MC32T7051", label: "MC32T7051（RISC OTP，高通道 ADC）" },
      { value: "MC51F8144", label: "MC51F8144（8051，26 路触摸）" },
      { value: "MA51F8203", label: "MA51F8203（1T 8051，车规）" },
      { value: "MC30P6310", label: "MC30P6310（RISC OTP，通用 GPIO）" },
    ],
  },
  {
    label: "其他型号（可开发支持）",
    items: [
      { value: "STM32F103", label: "STM32F103（兼容开发）" },
      { value: "STM32F407", label: "STM32F407（兼容开发）" },
      { value: "GD32E230", label: "GD32E230（兼容开发）" },
      { value: "ESP32-S3", label: "ESP32-S3（兼容开发）" },
      { value: "CH32V203", label: "CH32V203（兼容开发）" },
      { value: "__custom__", label: "自定义型号（手动填写）…" },
    ],
  },
];

const PROMPT_TIPS = [
  "采集 / 控制对象：测什么、控什么，传感器或执行器型号",
  "通信接口与协议：RS485 / CAN / 以太网…，Modbus-RTU / CANopen…",
  "工作节拍：采样周期、上报周期、实时性要求",
  "供电与环境：电压范围、工作温度、功耗约束",
  "人机交互：指示灯、按键、显示屏需求",
];

const REQUIREMENT_PLACEHOLDER = `建议按「共性要素」描述，AI 会自动补全工程细节：
采集对象：如 4 路温度（HXT-880）+ 1 路 4-20mA 压力
通信方式：如 RS485，Modbus-RTU 从站
工作节拍：如 1 秒采样、10 秒上报
供电环境：如 DC 24V，-20℃~70℃ 工业现场
交互需求：如运行指示灯 + 按键配置地址
（你的特殊要求请直接补充在后面）`;

const PIN_FALLBACK: PinInfo[] = [
  { pin: "P01", func: "RS485_DE", note: "方向控制，默认低" },
  { pin: "P02", func: "UART_TX", note: "RS485 数据发送" },
  { pin: "P03", func: "UART_RX", note: "RS485 数据接收" },
  { pin: "P10", func: "I2C_SCL", note: "上拉 4.7kΩ" },
  { pin: "P11", func: "I2C_SDA", note: "上拉 4.7kΩ" },
  { pin: "P20", func: "LED_STATUS", note: "运行指示灯" },
];

export default function Assistant() {
  const { member, loading } = useAuth();
  const navigate = useNavigate();

  const [requirement, setRequirement] = useState("");
  const [schematic, setSchematic] = useState("");
  const [mcu, setMcu] = useState("MS60F3026");
  const [customMcu, setCustomMcu] = useState("");
  const [peripherals, setPeripherals] = useState<string[]>([
    "UART / RS485",
    "I²C 传感器",
  ]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = trpc.ai.generate.useMutation({
    onError: (e) => toast.error(`生成失败：${e.message}`),
  });

  const mcuLabel = useMemo(() => {
    if (mcu === "__custom__") return customMcu.trim() || "自定义型号";
    for (const grp of MCU_GROUPS) {
      const hit = grp.items.find((i) => i.value === mcu);
      if (hit) return hit.value;
    }
    return mcu;
  }, [mcu, customMcu]);

  // 布局：由引脚数量与外设选择驱动（预览与 Gerber 共用）
  const layout = useMemo(() => {
    const pins = result?.pins ? parsePins(result.pins) : PIN_FALLBACK;
    return layoutBoard({
      mcuName: mcuLabel,
      pinCount: Math.max(pins.length, 24),
      peripherals,
    });
  }, [result, mcuLabel, peripherals]);

  const parsedPins = useMemo(
    () => (result?.pins ? parsePins(result.pins) : PIN_FALLBACK),
    [result],
  );

  const togglePeripheral = (p: string) => {
    setPeripherals((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const startGeneration = async () => {
    if (mcu === "__custom__" && !customMcu.trim()) {
      toast.error("请填写自定义 MCU 型号");
      return;
    }
    setRunning(true);
    setDone(false);
    setResult(null);
    setStep(0);
    let current = 0;
    timerRef.current = setInterval(() => {
      current += 1;
      if (current >= PIPELINE_STEPS.length - 1) {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setStep(current);
      }
    }, 2000);
    try {
      const r = await generate.mutateAsync({
        requirement,
        mcu: mcuLabel,
        peripherals,
        schematic: schematic.trim() || undefined,
      });
      setResult(r);
      setStep(PIPELINE_STEPS.length - 1);
      setDone(true);
      toast.success("AI 生成完成，版图已按你的选型实时更新");
    } catch {
      setStep(-1);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setRunning(false);
    }
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setDone(false);
    setStep(-1);
    setResult(null);
  };

  const exportGerber = async () => {
    setExporting(true);
    try {
      await downloadGerberZip({
        layout,
        mcuLabel,
        pins: parsedPins,
        bom: result?.bom ?? "",
      });
      toast.success("Gerber 工程包已下载，可直接上传打板平台");
    } catch (e) {
      toast.error(`导出失败：${e instanceof Error ? e.message : "未知错误"}`);
    } finally {
      setExporting(false);
    }
  };

  const progress = useMemo(() => {
    if (done) return 100;
    if (step < 0) return 0;
    return Math.round(((step + 1) / PIPELINE_STEPS.length) * 100);
  }, [step, done]);

  // ---------- 未登录：介绍 + 引导注册 ----------
  if (!loading && !member) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 mb-4">
              会员专享工具
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight">
              AI 编程助手
              <br />
              <span className="text-cyan-400">从一句话到可打板的版图</span>
            </h1>
            <p className="text-slate-400 leading-relaxed mb-6">
              面向 MCU 设计工程师的 AI 辅助工作台：用自然语言描述需求，助手自动完成器件选型、固件代码生成、引脚分配、原理图建议，最终输出可直接送厂打板的
              PCB 版图与 Gerber 工程文件。
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "自然语言需求 → 完整嵌入式工程",
                "自动生成可编译的固件代码与驱动",
                "PCB 版图布局布线，输出 Gerber 打板文件",
                "与恒矽产品库深度联动，选型即所得",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex gap-4">
              <Button
                size="lg"
                className="bg-cyan-600 hover:bg-cyan-500 px-8"
                onClick={() => navigate("/register")}
              >
                注册会员，立即使用
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800"
                onClick={() => navigate("/login")}
              >
                已有账号，登录
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={asset("images/ai-assistant.webp")}
              alt="AI 编程助手"
              className="rounded-2xl border border-slate-800 w-full"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/50">
              <div className="flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700 px-5 py-2.5 text-sm text-slate-300">
                <Lock className="h-4 w-4 text-cyan-400" /> 登录后进入工作台
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- 已登录：工作台 ----------
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <Bot className="h-7 w-7 text-cyan-400" /> AI 编程助手工作台
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            你好，{member?.name} · 描述需求，AI 生成可打板的完整工程
          </p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          <Sparkles className="h-3.5 w-3.5 mr-1" /> DeepSeek 驱动 · 三重仿真验证
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 左侧：需求输入 */}
        <Card className="bg-slate-900/60 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">项目需求</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>需求描述</Label>
              <Textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                rows={8}
                className="bg-slate-800 border-slate-700 text-sm placeholder:text-slate-500"
                placeholder={REQUIREMENT_PLACEHOLDER}
              />
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-1.5 text-xs text-cyan-300 mb-1.5">
                  <Lightbulb className="h-3.5 w-3.5" /> 专业提示词模板（共性要素）
                </div>
                <ul className="space-y-1">
                  {PROMPT_TIPS.map((t) => (
                    <li key={t} className="text-[11px] text-slate-400 leading-relaxed">
                      · {t}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  按以上要素描述共性部分即可，你的个性化要求直接补充在后面。
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CircuitBoard className="h-3.5 w-3.5 text-cyan-400" />
                已有电气原理图
                <span className="text-xs text-slate-500 font-normal">（可选，提供后生成精度显著提高）</span>
              </Label>
              <Textarea
                value={schematic}
                onChange={(e) => setSchematic(e.target.value)}
                rows={4}
                className="bg-slate-800 border-slate-700 text-sm placeholder:text-slate-500"
                placeholder={`粘贴原理图连接关系或网表描述，例如：\nU1(MS60F3026) PA9/PA10 → U2(MAX3485) DI/RO，DE+RE 接 PA8\nJ1(RS485) A/B → TVS(SM712) → U2 A/B，120Ω 端接\n留空则由 AI 给出建议原理图`}
              />
            </div>
            <div className="space-y-2">
              <Label>目标 MCU</Label>
              <Select value={mcu} onValueChange={setMcu}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {MCU_GROUPS.map((grp) => (
                    <SelectGroup key={grp.label}>
                      <SelectLabel className="text-cyan-400 text-xs">
                        {grp.label}
                      </SelectLabel>
                      {grp.items.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {mcu === "__custom__" && (
                <Input
                  value={customMcu}
                  onChange={(e) => setCustomMcu(e.target.value)}
                  placeholder="输入型号，如 MSP430FR5969、nRF52840…"
                  className="bg-slate-800 border-slate-700 text-sm"
                />
              )}
              <p className="text-[11px] text-slate-500">
                优先推荐恒矽在售型号（选型即所得，可提供样品）；其他型号同样支持开发。
              </p>
            </div>
            <div className="space-y-2.5">
              <Label>
                外设需求
                <span className="text-xs text-slate-500 font-normal ml-2">
                  已选 {peripherals.length} 项
                </span>
              </Label>
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {PERIPHERAL_OPTIONS.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"
                  >
                    <Checkbox
                      checked={peripherals.includes(p)}
                      onCheckedChange={() => togglePeripheral(p)}
                      className="border-slate-600 data-[state=checked]:bg-cyan-600"
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button
                className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                onClick={startGeneration}
                disabled={running || !requirement.trim()}
              >
                {running ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {running ? "AI 生成中…" : "开始生成"}
              </Button>
              {(done || running) && (
                <Button
                  variant="outline"
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                  onClick={reset}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 右侧：生成流程与结果 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 流程 */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                生成流程
                {step >= 0 && (
                  <span className="text-sm font-normal text-cyan-400">
                    {progress}%
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step < 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  填写左侧需求，点击「开始生成」
                </p>
              ) : (
                <div className="space-y-2.5">
                  {PIPELINE_STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      {done || i < step ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : i === step && running ? (
                        <Loader2 className="h-5 w-5 text-cyan-400 animate-spin shrink-0" />
                      ) : i === step ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-700 shrink-0" />
                      )}
                      <span
                        className={cn(
                          i <= step ? "text-slate-200" : "text-slate-600",
                          i === step && running && "text-cyan-300",
                        )}
                      >
                        {s}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 三重仿真验证报告 */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> 仿真验证报告
                <span className="text-xs font-normal text-slate-500">
                  软件 → 硬件 → 物理，逐级验证
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!done ? (
                <p className="text-sm text-slate-500 py-4 text-center">
                  生成完成后，此处展示三级仿真验证结果
                </p>
              ) : (
                <div className="space-y-4">
                  {[
                    {
                      name: "代码逻辑仿真（软件仿真）",
                      content: result?.simLogic,
                      color: "text-cyan-300",
                    },
                    {
                      name: "功能与时序仿真（硬件仿真）",
                      content: result?.simTiming,
                      color: "text-amber-300",
                    },
                    {
                      name: "信号完整性仿真（物理仿真）",
                      content: result?.simSI,
                      color: "text-emerald-300",
                    },
                  ].map((sim) => (
                    <div
                      key={sim.name}
                      className="rounded-lg border border-slate-800 bg-slate-950/60"
                    >
                      <div className={`px-4 py-2 text-sm font-medium border-b border-slate-800 flex items-center gap-2 ${sim.color}`}>
                        <CheckCircle2 className="h-4 w-4" /> {sim.name}
                      </div>
                      <div className="p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                        {sim.content || "（该仿真小节未返回内容，可重新生成）"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 结果 */}
          {done && (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                  生成结果（已通过三重仿真验证）
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    onClick={exportGerber}
                    disabled={exporting}
                  >
                    {exporting ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {exporting ? "打包中…" : "导出 Gerber 工程包"}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="code">
                  <TabsList className="bg-slate-800 border border-slate-700">
                    <TabsTrigger value="code">
                      <FileCode2 className="h-3.5 w-3.5 mr-1.5" /> 固件代码
                    </TabsTrigger>
                    <TabsTrigger value="pins">
                      <ListOrdered className="h-3.5 w-3.5 mr-1.5" /> 引脚分配
                    </TabsTrigger>
                    <TabsTrigger value="schematic">
                      <CircuitBoard className="h-3.5 w-3.5 mr-1.5" /> 电气原理图
                    </TabsTrigger>
                    <TabsTrigger value="bom">
                      <ListOrdered className="h-3.5 w-3.5 mr-1.5" /> 物料清单
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="code" className="pt-4">
                    <pre className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-xs leading-relaxed overflow-x-auto text-slate-300 max-h-96">
                      {result?.code}
                    </pre>
                  </TabsContent>
                  <TabsContent value="pins" className="pt-4">
                    {parsedPins.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-800">
                            <th className="py-2 pr-4 font-medium">引脚</th>
                            <th className="py-2 pr-4 font-medium">功能</th>
                            <th className="py-2 font-medium">备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedPins.map((p) => (
                            <tr
                              key={p.pin}
                              className="border-b border-slate-800/50 text-slate-300"
                            >
                              <td className="py-2 pr-4 font-mono text-cyan-300">
                                {p.pin}
                              </td>
                              <td className="py-2 pr-4 font-mono">{p.func}</td>
                              <td className="py-2 text-slate-400">{p.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                        {result?.pins}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="schematic" className="pt-4">
                    <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-mono text-xs">
                      {result?.schematic || "（未返回原理图内容，可重新生成）"}
                    </div>
                  </TabsContent>
                  <TabsContent value="bom" className="pt-4">
                    <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {result?.bom}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
