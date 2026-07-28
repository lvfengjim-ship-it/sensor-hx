import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Store,
  ShoppingCart,
  Upload,
  BadgeCheck,
  Flame,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useLang, type LText } from "@/lib/i18n";

type Solution = {
  key: string;
  title: LText;
  mcu: string;
  desc: LText;
  includes: LText[];
  price: number;
  sales: number;
  verified: boolean;
  hot?: boolean;
};

const solutions: Solution[] = [
  {
    key: "rs485-temp-node",
    title: { zh: "RS485 多路温度采集节点", en: "RS485 Multi-Channel Temperature Node" },
    mcu: "STM32F103 / HXM-32F4",
    desc: {
      zh: "8 路 PT100 采集，Modbus-RTU 从站，已在 300+ 储能柜项目量产运行 3 年。",
      en: "8-channel PT100 acquisition, Modbus-RTU slave — in mass production across 300+ energy storage cabinets for 3 years.",
    },
    includes: [
      { zh: "完整源码（Keil/CMake）", en: "Full source code (Keil/CMake)" },
      { zh: "原理图+PCB（Altium）", en: "Schematic + PCB (Altium)" },
      { zh: "上位机调试工具", en: "PC debugging tool" },
      { zh: "30 天答疑", en: "30-day Q&A support" },
    ],
    price: 680,
    sales: 127,
    verified: true,
    hot: true,
  },
  {
    key: "foc-motor",
    title: { zh: "BLDC 无感 FOC 驱动方案", en: "BLDC Sensorless FOC Drive" },
    mcu: "HXM-32F4",
    desc: {
      zh: "滑模观测器无感 FOC，支持 24V/48V 风机水泵，启动成功率 99.9%，含参数整定指南。",
      en: "Sliding-mode observer sensorless FOC for 24V/48V fans and pumps; 99.9% start-up success, with tuning guide.",
    },
    includes: [
      { zh: "FOC 算法库源码", en: "FOC algorithm library source" },
      { zh: "参考硬件设计", en: "Reference hardware design" },
      { zh: "参数整定文档", en: "Parameter tuning docs" },
      { zh: "90 天答疑", en: "90-day Q&A support" },
    ],
    price: 2980,
    sales: 43,
    verified: true,
  },
  {
    key: "lora-sensor",
    title: { zh: "LoRa 低功耗传感节点", en: "LoRa Low-Power Sensor Node" },
    mcu: "STM32L071 / HXM-32U0",
    desc: {
      zh: "LoRaWAN Class A 节点固件，2 节 AA 电池续航 5 年，已通过实际园区部署验证。",
      en: "LoRaWAN Class A node firmware; 5-year battery life on 2 AA cells, proven in real campus deployment.",
    },
    includes: [
      { zh: "节点源码", en: "Node source code" },
      { zh: "LoRaWAN 协议栈移植", en: "LoRaWAN stack porting" },
      { zh: "低功耗设计指南", en: "Low-power design guide" },
      { zh: "30 天答疑", en: "30-day Q&A support" },
    ],
    price: 1280,
    sales: 86,
    verified: true,
  },
  {
    key: "can-gateway",
    title: { zh: "CAN-FD 车载数据网关", en: "CAN-FD Vehicle Data Gateway" },
    mcu: "HXM-32F4",
    desc: {
      zh: "3 路 CAN-FD 转发 + UDS 诊断 + 本地存储，车规项目量产方案，含 Bootloader。",
      en: "3-channel CAN-FD routing + UDS diagnostics + local storage; production solution for automotive projects, Bootloader included.",
    },
    includes: [
      { zh: "网关源码", en: "Gateway source code" },
      { zh: "UDS 协议栈", en: "UDS protocol stack" },
      { zh: "CANoe 工程", en: "CANoe project" },
      { zh: "180 天答疑", en: "180-day Q&A support" },
    ],
    price: 4500,
    sales: 21,
    verified: true,
  },
  {
    key: "hmi-display",
    title: { zh: "串口屏 HMI 交互框架", en: "Serial Display HMI Framework" },
    mcu: "GD32E230",
    desc: {
      zh: "轻量级 UI 框架，支持页面管理、数据绑定、OTA 升级，适合家电与仪器面板。",
      en: "Lightweight UI framework with page management, data binding and OTA upgrade — ideal for appliance and instrument panels.",
    },
    includes: [
      { zh: "UI 框架源码", en: "UI framework source" },
      { zh: "控件库", en: "Widget library" },
      { zh: "示例工程 6 个", en: "6 example projects" },
      { zh: "30 天答疑", en: "30-day Q&A support" },
    ],
    price: 480,
    sales: 215,
    verified: true,
    hot: true,
  },
  {
    key: "bms-afe",
    title: { zh: "16 串 BMS 采集保护板", en: "16-Cell BMS Protection Board" },
    mcu: "STM32F030 + AFE",
    desc: {
      zh: "电池电压/温度采集 + 被动均衡 + SOC 估算，适配储能与低速车场景。",
      en: "Cell voltage/temperature acquisition + passive balancing + SOC estimation, for energy storage and low-speed vehicles.",
    },
    includes: [
      { zh: "BMS 源码", en: "BMS source code" },
      { zh: "SOC 算法说明", en: "SOC algorithm notes" },
      { zh: "原理图+PCB", en: "Schematic + PCB" },
      { zh: "60 天答疑", en: "60-day Q&A support" },
    ],
    price: 1880,
    sales: 58,
    verified: true,
  },
];

export default function Marketplace() {
  const { member } = useAuth();
  const navigate = useNavigate();
  const { t, pick } = useLang();
  const [buyTarget, setBuyTarget] = useState<Solution | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [pubForm, setPubForm] = useState({
    title: "",
    mcu: "",
    description: "",
    price: "",
  });

  const createOrder = trpc.member.createOrder.useMutation({
    onSuccess: (r) => {
      toast.success(r.message);
      setBuyTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const publish = trpc.member.publishSolution.useMutation({
    onSuccess: (r) => {
      toast.success(r.message);
      setPublishOpen(false);
      setPubForm({ title: "", mcu: "", description: "", price: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleBuy = (s: Solution) => {
    if (!member) {
      toast.info(t("请先登录后再购买方案", "Please log in before purchasing"));
      navigate("/login");
      return;
    }
    setBuyTarget(s);
  };

  const handlePublishOpen = () => {
    if (!member) {
      toast.info(t("发布方案需要先注册会员", "Sign up to publish your solution"));
      navigate("/register");
      return;
    }
    setPublishOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 flex items-center gap-3">
            <Store className="h-8 w-8 text-cyan-400" /> {t("方案集市", "Solution Marketplace")}
          </h1>
          <p className="text-slate-400 max-w-2xl">
            {t(
              "MCU 经典编程集锦：每一套方案都经过量产验证，购买即得完整源码与硬件设计。你也可以发布自己的方案，获得持续收益。",
              "Classic MCU designs: every solution is production-proven — purchase includes full source code and hardware design. Publish your own solution and earn ongoing revenue.",
            )}
          </p>
        </div>
        <Button
          className="bg-cyan-600 hover:bg-cyan-500"
          onClick={handlePublishOpen}
        >
          <Upload className="mr-2 h-4 w-4" /> {t("发布我的方案", "Publish My Solution")}
        </Button>
      </div>

      {/* 平台规则条 */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { icon: BadgeCheck, text: t("上架方案经恒矽实验室实测验证", "All solutions verified by the Hengxi lab") },
          { icon: Download, text: t("购买后即时获得完整工程文件", "Full engineering files delivered instantly") },
          { icon: Store, text: t("卖家获得交易额 80% 分成", "Sellers earn 80% of each sale") },
        ].map((r) => (
          <div
            key={r.text}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-300"
          >
            <r.icon className="h-5 w-5 text-cyan-400 shrink-0" />
            {r.text}
          </div>
        ))}
      </div>

      {/* 方案列表 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {solutions.map((s) => (
          <Card
            key={s.key}
            className="bg-slate-900/60 border-slate-800 hover:border-cyan-500/40 transition-colors flex flex-col"
          >
            <CardContent className="p-5 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-2">
                {s.hot && (
                  <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30">
                    <Flame className="h-3 w-3 mr-1" /> {t("热销", "Hot")}
                  </Badge>
                )}
                {s.verified && (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                    <BadgeCheck className="h-3 w-3 mr-1" /> {t("量产验证", "Proven")}
                  </Badge>
                )}
              </div>
              <h3 className="font-bold text-lg mb-1">{pick(s.title)}</h3>
              <p className="text-xs font-mono text-cyan-400/80 mb-2.5">{s.mcu}</p>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">
                {pick(s.desc)}
              </p>
              <ul className="space-y-1 mb-4">
                {s.includes.map((i) => (
                  <li key={i.en} className="text-xs text-slate-500 flex gap-1.5">
                    <span className="text-cyan-500">·</span> {pick(i)}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-800">
                <div>
                  <span className="text-xl font-bold text-cyan-300">
                    ¥{s.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    {t(`已售 ${s.sales}`, `${s.sales} sold`)}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500"
                  onClick={() => handleBuy(s)}
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> {t("购买", "Buy")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 购买确认 */}
      <Dialog open={!!buyTarget} onOpenChange={(v) => !v && setBuyTarget(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>{t("确认购买", "Confirm Purchase")}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {buyTarget && pick(buyTarget.title)}（{buyTarget?.mcu}）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-slate-800/60 p-4 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">{t("方案价格", "Price")}</span>
                <span className="font-bold text-cyan-300">
                  ¥{buyTarget?.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("购买人", "Buyer")}</span>
                <span>
                  {member?.name}（{member?.company}）
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t("交付方式", "Delivery")}</span>
                <span>{t("订单确认后发送至注册邮箱", "Emailed after order confirmation")}</span>
              </div>
            </div>
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500"
              disabled={createOrder.isPending}
              onClick={() =>
                buyTarget &&
                createOrder.mutate({
                  solutionKey: buyTarget.key,
                  solutionTitle: pick(buyTarget.title),
                  price: buyTarget.price,
                })
              }
            >
              {createOrder.isPending ? t("创建订单中…", "Creating order…") : t("确认下单", "Place Order")}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              {t(
                "演示环境：下单即生成订单记录，正式环境将接入在线支付。",
                "Demo: orders are recorded directly; online payment coming in production.",
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 发布方案 */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>{t("发布我的方案", "Publish My Solution")}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {t(
                "提交后由恒矽实验室审核验证，通过后上架并获得 80% 交易分成。",
                "Submissions are reviewed and verified by the Hengxi lab. Once approved, your solution goes live and earns 80% of sales.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("方案名称", "Solution Name")} *</Label>
              <Input
                value={pubForm.title}
                onChange={(e) =>
                  setPubForm({ ...pubForm, title: e.target.value })
                }
                placeholder={t("例如：4G DTU 透传固件", "e.g. 4G DTU transparent-transmission firmware")}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("适用 MCU", "Target MCU")} *</Label>
              <Input
                value={pubForm.mcu}
                onChange={(e) => setPubForm({ ...pubForm, mcu: e.target.value })}
                placeholder="e.g. STM32F407 / HXM-32F4"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("方案简介", "Description")} *</Label>
              <Textarea
                value={pubForm.description}
                onChange={(e) =>
                  setPubForm({ ...pubForm, description: e.target.value })
                }
                placeholder={t("功能、验证情况、包含哪些交付物…", "Features, validation status, deliverables…")}
                rows={4}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("定价（元）", "Price (CNY)")} *</Label>
              <Input
                type="number"
                value={pubForm.price}
                onChange={(e) =>
                  setPubForm({ ...pubForm, price: e.target.value })
                }
                placeholder="e.g. 980"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500"
              disabled={
                publish.isPending ||
                !pubForm.title ||
                !pubForm.mcu ||
                pubForm.description.length < 10 ||
                !pubForm.price
              }
              onClick={() =>
                publish.mutate({
                  title: pubForm.title,
                  mcu: pubForm.mcu,
                  description: pubForm.description,
                  price: parseInt(pubForm.price, 10),
                })
              }
            >
              {publish.isPending ? t("提交中…", "Submitting…") : t("提交审核", "Submit for Review")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
