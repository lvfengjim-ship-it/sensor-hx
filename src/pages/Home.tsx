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
import { useLang, type LText } from "@/lib/i18n";

const pillars: {
  icon: typeof Cpu;
  image: string;
  title: LText;
  subtitle: LText;
  desc: LText;
  to: string;
  cta: LText;
  badge?: LText;
}[] = [
  {
    icon: Cpu,
    image: asset("images/home-products.webp"),
    title: { zh: "产品中心", en: "Product Center" },
    subtitle: { zh: "传感器与 MCU 产品资料", en: "Sensor & MCU Documentation" },
    desc: {
      zh: "8位、32 位 MCU 产品线，多样化模拟和功率芯片，压力、温湿度、电流等工业级传感器，完整数据手册、选型指南与样品申请一站获取。",
      en: "8-bit and 32-bit MCU product lines, diverse analog and power chips, industrial-grade pressure, temperature/humidity and current sensors — datasheets, selection guides and sample requests in one place.",
    },
    to: "/products",
    cta: { zh: "浏览产品", en: "Browse Products" },
  },
  {
    icon: Bot,
    image: asset("images/ai-assistant.webp"),
    title: { zh: "AI 编程助手", en: "AI Coding Assistant" },
    subtitle: { zh: "MCU 设计工程师的智能伙伴", en: "The MCU Design Engineer's Smart Partner" },
    desc: {
      zh: "描述你的需求，AI 辅助完成固件代码、引脚配置与 PCB 版图设计，输出可直接打板试样的工程文件。",
      en: "Describe your requirements — AI assists with firmware code, pin configuration and PCB layout, delivering engineering files ready for prototyping.",
    },
    to: "/assistant",
    cta: { zh: "进入工作台", en: "Open Workspace" },
    badge: { zh: "会员专享", en: "Members Only" },
  },
  {
    icon: Store,
    image: asset("images/marketplace.webp"),
    title: { zh: "方案集市", en: "Solution Marketplace" },
    subtitle: { zh: "MCU 经典编程集锦交易平台", en: "Classic MCU Solutions Trading Platform" },
    desc: {
      zh: "经量产验证的经典 MCU 方案明码标价、即买即用；你也可以发布自己的成熟方案，让代码产生持续收益。",
      en: "Production-proven MCU solutions, clearly priced and ready to use — or publish your own proven designs and earn ongoing revenue from your code.",
    },
    to: "/marketplace",
    cta: { zh: "逛逛集市", en: "Explore Marketplace" },
  },
];

const stats: { value: string; label: LText }[] = [
  { value: "12+", label: { zh: "年行业深耕", en: "Years in the Industry" } },
  { value: "300+", label: { zh: "合作企业客户", en: "Enterprise Clients" } },
  { value: "50+", label: { zh: "量产验证方案", en: "Production-Proven Solutions" } },
  { value: "24h", label: { zh: "技术响应时效", en: "Technical Response Time" } },
];

const advantages: { icon: typeof Cpu; title: LText; desc: LText }[] = [
  {
    icon: ShieldCheck,
    title: { zh: "工业级品质", en: "Industrial-Grade Quality" },
    desc: {
      zh: "I级湿敏等级、耐高温芯片可供，多款产品通过 AEC-Q100 等可靠性验证，全流程质量追溯。",
      en: "MSL-1 moisture sensitivity and high-temperature chips available; multiple products qualified to AEC-Q100 with full-process quality traceability.",
    },
  },
  {
    icon: Zap,
    title: { zh: "快速交付", en: "Fast Delivery" },
    desc: {
      zh: "标准库存品 48 小时发货，定制方案四周内出样。",
      en: "Standard stocked items ship within 48 hours; custom solution samples within four weeks.",
    },
  },
  {
    icon: CircuitBoard,
    title: { zh: "设计即制造", en: "Design-to-Manufacture" },
    desc: {
      zh: "AI 助手输出的版图直接对接打板厂，缩短试样周期。",
      en: "AI-generated layouts go straight to the PCB fab, shortening the prototyping cycle.",
    },
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { t, pick } = useLang();

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
              {t("传感 · 智联 · 未来", "Sense · Connect · Future")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {t("让每一颗芯片", "Getting Every Chip")}
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {t("更快走进产品", "Into Products, Faster")}
              </span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              {t(
                "上海恒矽传感器有限公司 —— 从工业级传感器芯片、AI 辅助设计工具到成熟方案交易，为嵌入式工程师打通从选型到量产的全链路。",
                "Shanghai Hengxi Sensor Co., Ltd. — from industrial-grade sensor chips and AI-assisted design tools to proven solution trading, connecting embedded engineers from selection to mass production.",
              )}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/products")}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-8"
              >
                {t("浏览产品资料", "Browse Products")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/assistant")}
                className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800 px-8"
              >
                {t("体验 AI 编程助手", "Try AI Assistant")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 数据 */}
      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.value} className="text-center">
              <div className="text-3xl font-bold text-cyan-400">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{pick(s.label)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 三大板块 */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("三大核心板块", "Three Core Pillars")}</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            {t(
              "产品资料、AI 辅助设计、方案交易 —— 一个平台，覆盖嵌入式开发全流程。",
              "Product documentation, AI-assisted design, and solution trading — one platform covering the entire embedded development workflow.",
            )}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {pillars.map((p) => (
            <Card
              key={p.to}
              className="bg-slate-900/60 border-slate-800 overflow-hidden group hover:border-cyan-500/50 transition-all duration-300"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={p.image}
                  alt={pick(p.title)}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                {p.badge && (
                  <span className="absolute top-3 right-3 rounded-full bg-cyan-500/90 px-3 py-1 text-xs font-medium text-white">
                    {pick(p.badge)}
                  </span>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <p.icon className="h-5 w-5 text-cyan-400" />
                  <h3 className="text-xl font-bold">{pick(p.title)}</h3>
                </div>
                <p className="text-sm text-cyan-400/80 mb-3">{pick(p.subtitle)}</p>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">
                  {pick(p.desc)}
                </p>
                <Link
                  to={p.to}
                  className="inline-flex items-center text-sm font-medium text-cyan-300 hover:text-cyan-200"
                >
                  {pick(p.cta)} <ChevronRight className="ml-1 h-4 w-4" />
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
            <h2 className="text-3xl font-bold mb-3">{t("为什么选择恒矽", "Why Hengxi")}</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {advantages.map((a) => (
              <div key={pick(a.title)} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <a.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5">{pick(a.title)}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {pick(a.desc)}
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
            {t("注册会员，解锁 AI 编程助手与方案交易", "Sign Up to Unlock the AI Assistant and Marketplace")}
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            {t(
              "一分钟完成注册，即可使用 AI 辅助设计工作台，发布和购买经过验证的 MCU 方案。",
              "Register in one minute to use the AI-assisted design workspace, and publish or purchase proven MCU solutions.",
            )}
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/register")}
            className="bg-cyan-600 hover:bg-cyan-500 px-10"
          >
            {t("免费注册会员", "Sign Up Free")}
          </Button>
          <p className="mt-6 text-sm text-slate-400">
            {t("业务咨询请致电服务热线：", "For business inquiries, call our hotline: ")}
            <a
              href="tel:4001101289"
              className="text-cyan-400 hover:text-cyan-300 font-medium tracking-wide"
            >
              400-110-1289
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
