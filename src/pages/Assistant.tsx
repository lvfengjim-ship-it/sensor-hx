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
  LayoutGrid,
  ListOrdered,
  Download,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const PIPELINE_STEPS = [
  "需求解析与器件选型",
  "固件框架与驱动生成",
  "外设与引脚分配",
  "原理图连接建议",
  "PCB 版图布局布线",
  "Gerber 工程文件打包",
];

const MCU_OPTIONS = [
  { value: "HXM-32F4", label: "HXM-32F4（Cortex-M4F 168MHz）" },
  { value: "HXM-32U0", label: "HXM-32U0（Cortex-M0+ 低功耗）" },
  { value: "STM32F103", label: "STM32F103（兼容方案）" },
  { value: "GD32E230", label: "GD32E230（兼容方案）" },
];

const PERIPHERALS = [
  "UART / RS485",
  "CAN-FD",
  "I²C 传感器",
  "SPI 显示屏",
  "ADC 采集",
  "PWM 输出",
  "LoRa 无线",
  "以太网",
];

const SAMPLE_CODE = `/**
 * @file    main.c
 * @brief   温度采集 + RS485 上传节点 —— 由恒矽 AI 编程助手生成
 * @target  HXM-32F4 (Cortex-M4F 168MHz)
 * @note    已包含 HXT-880 驱动、Modbus-RTU 从站协议栈
 */
#include "hxm32f4xx.h"
#include "hxt880.h"
#include "modbus_slave.h"

#define SENSOR_ADDR   0x44
#define SAMPLE_PERIOD 1000u   /* 1s 采样周期 */

static hxt880_t    g_sensor;
static modbus_t    g_bus;
static uint32_t    g_tick = 0;

int main(void)
{
    system_clock_init();            /* 168MHz PLL */
    board_init();

    /* 外设初始化（引脚分配见 pin_mux.c） */
    i2c1_init(I2C_SPEED_400K);      /* PB6=SCL, PB7=SDA */
    usart2_rs485_init(9600);        /* PA2=TX, PA3=RX, PA1=DE */

    hxt880_init(&g_sensor, &hi2c1, SENSOR_ADDR);
    modbus_slave_init(&g_bus, 0x01, &huart2);

    while (1) {
        if (elapsed_ms(g_tick) >= SAMPLE_PERIOD) {
            g_tick = millis();
            float t = hxt880_read_temp(&g_sensor);
            float h = hxt880_read_humi(&g_sensor);
            modbus_update_reg(&g_bus, REG_TEMP, (int16_t)(t * 10));
            modbus_update_reg(&g_bus, REG_HUMI, (int16_t)(h * 10));
        }
        modbus_poll(&g_bus);        /* 响应主站请求 */
    }
}`;

const PIN_TABLE = [
  { pin: "PA1", func: "RS485 DE", note: "方向控制，默认低" },
  { pin: "PA2", func: "USART2_TX", note: "RS485 数据发送" },
  { pin: "PA3", func: "USART2_RX", note: "RS485 数据接收" },
  { pin: "PB6", func: "I2C1_SCL", note: "上拉 4.7kΩ" },
  { pin: "PB7", func: "I2C1_SDA", note: "上拉 4.7kΩ" },
  { pin: "PA9", func: "LED_STATUS", note: "运行指示灯" },
  { pin: "PC13", func: "KEY_CFG", note: "地址配置按键" },
  { pin: "PA0", func: "ADC_IN0", note: "备用模拟量采集" },
];

function PcbPreview() {
  return (
    <svg viewBox="0 0 640 420" className="w-full rounded-lg bg-[#0b3d2e]">
      {/* 板框 */}
      <rect x="10" y="10" width="620" height="400" rx="12" fill="#0d4a36" stroke="#1a7a58" strokeWidth="3" />
      {/* MCU */}
      <rect x="270" y="150" width="100" height="100" fill="#1a1a2e" stroke="#888" strokeWidth="1.5" />
      <rect x="295" y="175" width="50" height="50" fill="#2a2a4a" />
      <text x="320" y="203" fill="#7dd3fc" fontSize="11" textAnchor="middle" fontFamily="monospace">HXM-32F4</text>
      {Array.from({ length: 12 }).map((_, i) => (
        <g key={`p${i}`}>
          <rect x={264} y={154 + i * 8} width={6} height={4} fill="#c8c86e" />
          <rect x={370} y={154 + i * 8} width={6} height={4} fill="#c8c86e" />
          <rect x={274 + i * 8} y={144} width={4} height={6} fill="#c8c86e" />
          <rect x={274 + i * 8} y={250} width={4} height={6} fill="#c8c86e" />
        </g>
      ))}
      {/* 传感器 */}
      <rect x="80" y="60" width="60" height="46" fill="#223" stroke="#777" />
      <text x="110" y="87" fill="#a5f3fc" fontSize="10" textAnchor="middle" fontFamily="monospace">HXT-880</text>
      {/* RS485 芯片 */}
      <rect x="480" y="300" width="70" height="40" fill="#223" stroke="#777" />
      <text x="515" y="324" fill="#a5f3fc" fontSize="10" textAnchor="middle" fontFamily="monospace">MAX485</text>
      {/* 接线端子 */}
      <rect x="540" y="40" width="70" height="90" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
      <text x="575" y="90" fill="#86efac" fontSize="10" textAnchor="middle" fontFamily="monospace">TB-4P</text>
      {/* 晶振 */}
      <rect x="270" y="290" width="44" height="18" rx="4" fill="#71717a" />
      <text x="292" y="303" fill="#e4e4e7" fontSize="9" textAnchor="middle" fontFamily="monospace">8MHz</text>
      {/* 走线 */}
      <g stroke="#facc15" strokeWidth="2.5" fill="none">
        <path d="M140 83 H200 V180 H270" />
        <path d="M370 220 H450 V320 H480" />
        <path d="M550 90 H470 V180 H370" />
        <path d="M292 290 V250" />
      </g>
      <g stroke="#38bdf8" strokeWidth="2" fill="none" strokeDasharray="5,4">
        <path d="M140 95 H190 V200 H270" />
        <path d="M370 235 H440 V332 H480" />
      </g>
      {/* 丝印 */}
      <text x="30" y="395" fill="#d1fae5" fontSize="12" fontFamily="monospace">HX-NODE V1.0  2026-07  JLC JLC JLC</text>
      <text x="30" y="35" fill="#d1fae5" fontSize="13" fontFamily="monospace">恒矽传感 · AI 生成版图预览（2 层板 80×50mm）</text>
    </svg>
  );
}

export default function Assistant() {
  const { member, loading } = useAuth();
  const navigate = useNavigate();

  const [requirement, setRequirement] = useState(
    "做一个 RS485 温度采集节点：HXT-880 温湿度传感器，Modbus-RTU 从站，1 秒采样，带运行指示灯和地址配置按键。",
  );
  const [mcu, setMcu] = useState("HXM-32F4");
  const [peripherals, setPeripherals] = useState<string[]>([
    "UART / RS485",
    "I²C 传感器",
  ]);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const togglePeripheral = (p: string) => {
    setPeripherals((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const startGeneration = () => {
    setRunning(true);
    setDone(false);
    setStep(0);
    let current = 0;
    timerRef.current = setInterval(() => {
      current += 1;
      if (current >= PIPELINE_STEPS.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setRunning(false);
        setDone(true);
        setStep(PIPELINE_STEPS.length - 1);
      } else {
        setStep(current);
      }
    }, 1200);
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setDone(false);
    setStep(-1);
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
                  <CheckCircle2 className="h-4.5 w-4.5 h-5 w-5 text-cyan-400 shrink-0" />
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
              src="/images/ai-assistant.png"
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
          <Sparkles className="h-3.5 w-3.5 mr-1" /> 演示模式 · 即将接入大模型
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
                rows={5}
                className="bg-slate-800 border-slate-700 text-sm"
                placeholder="例如：做一个 4 路温度采集器，CAN 总线上传…"
              />
            </div>
            <div className="space-y-2">
              <Label>目标 MCU</Label>
              <Select value={mcu} onValueChange={setMcu}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                  {MCU_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label>外设需求</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {PERIPHERALS.map((p) => (
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
                        <CheckCircle2 className="h-4.5 w-4.5 h-5 w-5 text-emerald-400 shrink-0" />
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

          {/* 结果 */}
          {done && (
            <Card className="bg-slate-900/60 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                  生成结果
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => {}}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    导出 Gerber 工程包
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="pcb">
                  <TabsList className="bg-slate-800 border border-slate-700">
                    <TabsTrigger value="pcb">
                      <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> PCB 版图
                    </TabsTrigger>
                    <TabsTrigger value="code">
                      <FileCode2 className="h-3.5 w-3.5 mr-1.5" /> 固件代码
                    </TabsTrigger>
                    <TabsTrigger value="pins">
                      <ListOrdered className="h-3.5 w-3.5 mr-1.5" /> 引脚分配
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="pcb" className="pt-4">
                    <PcbPreview />
                    <p className="text-xs text-slate-500 mt-2">
                      2 层板 · 80×50mm · 已按嘉立创工艺规则检查（DRC 通过），可直接导出
                      Gerber 送厂打样。
                    </p>
                  </TabsContent>
                  <TabsContent value="code" className="pt-4">
                    <pre className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-xs leading-relaxed overflow-x-auto text-slate-300 max-h-96">
                      {SAMPLE_CODE}
                    </pre>
                  </TabsContent>
                  <TabsContent value="pins" className="pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-2 pr-4 font-medium">引脚</th>
                          <th className="py-2 pr-4 font-medium">功能</th>
                          <th className="py-2 font-medium">备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PIN_TABLE.map((p) => (
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
