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

type Solution = {
  key: string;
  title: string;
  mcu: string;
  desc: string;
  includes: string[];
  price: number;
  sales: number;
  verified: boolean;
  hot?: boolean;
};

const solutions: Solution[] = [
  {
    key: "rs485-temp-node",
    title: "RS485 多路温度采集节点",
    mcu: "STM32F103 / HXM-32F4",
    desc: "8 路 PT100 采集，Modbus-RTU 从站，已在 300+ 储能柜项目量产运行 3 年。",
    includes: ["完整源码（Keil/CMake）", "原理图+PCB（Altium）", "上位机调试工具", "30 天答疑"],
    price: 680,
    sales: 127,
    verified: true,
    hot: true,
  },
  {
    key: "foc-motor",
    title: "BLDC 无感 FOC 驱动方案",
    mcu: "HXM-32F4",
    desc: "滑模观测器无感 FOC，支持 24V/48V 风机水泵，启动成功率 99.9%，含参数整定指南。",
    includes: ["FOC 算法库源码", "参考硬件设计", "参数整定文档", "90 天答疑"],
    price: 2980,
    sales: 43,
    verified: true,
  },
  {
    key: "lora-sensor",
    title: "LoRa 低功耗传感节点",
    mcu: "STM32L071 / HXM-32U0",
    desc: "LoRaWAN Class A 节点固件，2 节 AA 电池续航 5 年，已通过实际园区部署验证。",
    includes: ["节点源码", "LoRaWAN 协议栈移植", "低功耗设计指南", "30 天答疑"],
    price: 1280,
    sales: 86,
    verified: true,
  },
  {
    key: "can-gateway",
    title: "CAN-FD 车载数据网关",
    mcu: "HXM-32F4",
    desc: "3 路 CAN-FD 转发 + UDS 诊断 + 本地存储，车规项目量产方案，含 Bootloader。",
    includes: ["网关源码", "UDS 协议栈", "CANoe 工程", "180 天答疑"],
    price: 4500,
    sales: 21,
    verified: true,
  },
  {
    key: "hmi-display",
    title: "串口屏 HMI 交互框架",
    mcu: "GD32E230",
    desc: "轻量级 UI 框架，支持页面管理、数据绑定、OTA 升级，适合家电与仪器面板。",
    includes: ["UI 框架源码", "控件库", "示例工程 6 个", "30 天答疑"],
    price: 480,
    sales: 215,
    verified: true,
    hot: true,
  },
  {
    key: "bms-afe",
    title: "16 串 BMS 采集保护板",
    mcu: "STM32F030 + AFE",
    desc: "电池电压/温度采集 + 被动均衡 + SOC 估算，适配储能与低速车场景。",
    includes: ["BMS 源码", "SOC 算法说明", "原理图+PCB", "60 天答疑"],
    price: 1880,
    sales: 58,
    verified: true,
  },
];

export default function Marketplace() {
  const { member } = useAuth();
  const navigate = useNavigate();
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
      toast.info("请先登录后再购买方案");
      navigate("/login");
      return;
    }
    setBuyTarget(s);
  };

  const handlePublishOpen = () => {
    if (!member) {
      toast.info("发布方案需要先注册会员");
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
            <Store className="h-8 w-8 text-cyan-400" /> 方案集市
          </h1>
          <p className="text-slate-400 max-w-2xl">
            MCU 经典编程集锦：每一套方案都经过量产验证，购买即得完整源码与硬件设计。你也可以发布自己的方案，获得持续收益。
          </p>
        </div>
        <Button
          className="bg-cyan-600 hover:bg-cyan-500"
          onClick={handlePublishOpen}
        >
          <Upload className="mr-2 h-4 w-4" /> 发布我的方案
        </Button>
      </div>

      {/* 平台规则条 */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { icon: BadgeCheck, text: "上架方案经恒矽实验室实测验证" },
          { icon: Download, text: "购买后即时获得完整工程文件" },
          { icon: Store, text: "卖家获得交易额 80% 分成" },
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
                    <Flame className="h-3 w-3 mr-1" /> 热销
                  </Badge>
                )}
                {s.verified && (
                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                    <BadgeCheck className="h-3 w-3 mr-1" /> 量产验证
                  </Badge>
                )}
              </div>
              <h3 className="font-bold text-lg mb-1">{s.title}</h3>
              <p className="text-xs font-mono text-cyan-400/80 mb-2.5">{s.mcu}</p>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">
                {s.desc}
              </p>
              <ul className="space-y-1 mb-4">
                {s.includes.map((i) => (
                  <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                    <span className="text-cyan-500">·</span> {i}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-800">
                <div>
                  <span className="text-xl font-bold text-cyan-300">
                    ¥{s.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    已售 {s.sales}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-500"
                  onClick={() => handleBuy(s)}
                >
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> 购买
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
            <DialogTitle>确认购买</DialogTitle>
            <DialogDescription className="text-slate-400">
              {buyTarget?.title}（{buyTarget?.mcu}）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-slate-800/60 p-4 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">方案价格</span>
                <span className="font-bold text-cyan-300">
                  ¥{buyTarget?.price.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">购买人</span>
                <span>
                  {member?.name}（{member?.company}）
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">交付方式</span>
                <span>订单确认后发送至注册邮箱</span>
              </div>
            </div>
            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500"
              disabled={createOrder.isPending}
              onClick={() =>
                buyTarget &&
                createOrder.mutate({
                  solutionKey: buyTarget.key,
                  solutionTitle: buyTarget.title,
                  price: buyTarget.price,
                })
              }
            >
              {createOrder.isPending ? "创建订单中…" : "确认下单"}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              演示环境：下单即生成订单记录，正式环境将接入在线支付。
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* 发布方案 */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>发布我的方案</DialogTitle>
            <DialogDescription className="text-slate-400">
              提交后由恒矽实验室审核验证，通过后上架并获得 80% 交易分成。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>方案名称 *</Label>
              <Input
                value={pubForm.title}
                onChange={(e) =>
                  setPubForm({ ...pubForm, title: e.target.value })
                }
                placeholder="例如：4G DTU 透传固件"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>适用 MCU *</Label>
              <Input
                value={pubForm.mcu}
                onChange={(e) => setPubForm({ ...pubForm, mcu: e.target.value })}
                placeholder="例如：STM32F407 / HXM-32F4"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>方案简介 *</Label>
              <Textarea
                value={pubForm.description}
                onChange={(e) =>
                  setPubForm({ ...pubForm, description: e.target.value })
                }
                placeholder="功能、验证情况、包含哪些交付物…"
                rows={4}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>定价（元）*</Label>
              <Input
                type="number"
                value={pubForm.price}
                onChange={(e) =>
                  setPubForm({ ...pubForm, price: e.target.value })
                }
                placeholder="例如：980"
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
              {publish.isPending ? "提交中…" : "提交审核"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
