import { Link, useNavigate } from "react-router";
import {
  Cpu,
  Bot,
  Store,
  ArrowRight,
  ShieldCheck,
  Zap,
  CircuitBoard,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { asset } from "@/lib/asset";

const pillars = [
  {
    icon: Cpu,
    image: asset("images/home-products.webp"),
    title: "产品中心",
    subtitle: "传感器与 MCU 产品资料",
    desc: "8位、32 位 MCU 产品线，多样化模拟和功率芯片，压力、温湿度、电流等工业级传感器，完整数据手册、选型指南与样品申请一站获取。",
    to: "/products",
    cta: "浏览产品",
  },
  {
    icon: Bot,
    image: asset("images/ai-assistant.webp"),
    title: "AI 编程助手",
    subtitle: "MCU 设计工程师的智能伙伴",
    desc: "描述你的需求，AI 辅助完成固件代码、引脚配置与 PCB 版图设计，输出可直接打板试样的工程文件。",
    to: "/assistant",
    cta: "进入工作台",
    badge: "会员专享",
  },
  {
    icon: Store,
    image: asset("images/marketplace.webp"),
    title: "方案集市",
    subtitle: "MCU 经典编程集锦交易平台",
    desc: "经量产验证的经典 MCU 方案明码标价、即买即用；你也可以发布自己的成熟方案，让代码产生持续收益。",
    to: "/marketplace",
    cta: "逛逛集市",
  },
];

const stats = [
  { value: "12+", label: "年行业深耕" },
  { value: "300+", label: "合作企业客户" },
  { value: "50+", label: "量产验证方案" },
  { value: "24h", label: "技术响应时效" },
];

const advantages = [
  {
    icon: ShieldCheck,
    title: "工业级品质",
    desc: "I级湿敏等级、耐高温芯片可供，多款产品通过 AEC-Q100 等可靠性验证，全流程质量追溯。",
  },
  {
    icon: Zap,
    title: "快速交付",
    desc: "标准库存品 48 小时发货，定制方案四周内出样。",
  },
  {
    icon: CircuitBoard,
    title: "设计即制造",
    desc: "AI 助手输出的版图直接对接打板厂，缩短试样周期。",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={asset("images/hero.webp")}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/30" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-28 sm:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs text-cyan-300 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              传感 · 智联 · 未来
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              让每一颗芯片
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                更快走进产品
              </span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              上海恒矽传感器有限公司 —— 从工业级传感器芯片、AI
              辅助设计工具到成熟方案交易，为嵌入式工程师打通从选型到量产的全链路。
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/products")}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-8"
              >
                浏览产品资料 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/assistant")}
                className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 px-8"
              >
                体验 AI 编程助手
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 数据 */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 三大板块 */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">三大核心板块</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            产品资料、AI 辅助设计、方案交易 —— 一个平台，覆盖嵌入式开发全流程。
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {pillars.map((p) => (
            <Card
              key={p.title}
              className="bg-slate-900/60 border-slate-800 overflow-hidden group hover:border-cyan-500/50 transition-all duration-300"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={p.image}
                  alt={p.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                {p.badge && (
                  <span className="absolute top-3 right-3 rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-medium text-white">
                    {p.badge}
                  </span>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <p.icon className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-xl font-bold">{p.title}</h3>
                </div>
                <p className="text-sm text-cyan-400/80 mb-3">{p.subtitle}</p>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  {p.desc}
                </p>
                <Link
                  to={p.to}
                  className="inline-flex items-center text-sm font-medium text-cyan-300 hover:text-cyan-200"
                >
                  {p.cta} <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 优势 */}
      <section className="border-t border-slate-800 bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">为什么选择恒矽</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {advantages.map((a) => (
              <div key={a.title} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <a.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5">{a.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {a.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 p-10 sm:p-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            注册会员，解锁 AI 编程助手与方案交易
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            一分钟完成注册，即可使用 AI 辅助设计工作台，发布和购买经过验证的 MCU 方案。
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/register")}
            className="bg-cyan-600 hover:bg-cyan-500 px-10"
          >
            免费注册会员
          </Button>
        </div>
      </section>
    </div>
  );
}
