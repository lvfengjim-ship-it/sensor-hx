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

type Product = {
  model: string;
  name: string;
  image: string;
  category: string;
  desc: string;
  specs: { label: string; value: string }[];
  tags: string[];
  status: "量产" | "样品" | "预告";
};

const products: Product[] = [
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
    model: "HXP-3500",
    name: "汽车级绝压传感器模块",
    image: asset("images/product-pressure.png"),
    category: "pressure",
    desc: "面向汽车进气歧管、胎压与气压制动的绝压测量模块，EMC 性能通过 CISPR 25 Class 5。",
    specs: [
      { label: "量程", value: "20~400 kPa" },
      { label: "精度", value: "±1.0% FS（全温区）" },
      { label: "输出", value: "模拟比例电压 / SENT" },
      { label: "防护等级", value: "IP6K9K" },
    ],
    tags: ["车规级", "SENT 协议", "小批量现货"],
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
    model: "HXT-92A",
    name: "高温型温度探头",
    image: asset("images/product-temp.png"),
    category: "temperature",
    desc: "PT1000 敏感元件 + 不锈钢封装探头，适用于储能电池包与工业烘箱的温度监控。",
    specs: [
      { label: "测温范围", value: "-50℃ ~ +300℃" },
      { label: "精度", value: "A 级 ±0.15℃" },
      { label: "响应时间", value: "T0.5 < 3s" },
      { label: "线缆", value: "硅胶线 1m/3m 可选" },
    ],
    tags: ["储能应用", "耐高温"],
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
  {
    model: "HXC-60S",
    name: "闭环磁通门电流传感器",
    image: asset("images/product-current.png"),
    category: "current",
    desc: "磁通门技术实现 ppm 级零点稳定性，面向电池化成、精密电源等高精度场合。",
    specs: [
      { label: "量程", value: "±60A" },
      { label: "精度", value: "±0.05%" },
      { label: "温漂", value: "< 10ppm/℃" },
      { label: "输出", value: "电流环 40mA@60A" },
    ],
    tags: ["高精度", "新品"],
    status: "样品",
  },
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
];

const categories = [
  { key: "all", label: "全部产品" },
  { key: "pressure", label: "压力传感" },
  { key: "temperature", label: "温湿度传感" },
  { key: "current", label: "电流检测" },
  { key: "mcu", label: "MCU 主控" },
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
          工业级传感器与 MCU 产品线，提供完整数据手册、参考设计与样品支持。点击「索取资料
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
            className="bg-slate-900/60 border-slate-800 overflow-hidden hover:border-cyan-500/40 transition-colors"
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
            我们提供传感器定制开发与国产替代选型服务，告诉我们你的应用场景与指标要求，2
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
                placeholder="应用场景、目标量程/精度、预计用量…"
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
