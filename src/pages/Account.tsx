import { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  User,
  ShoppingBag,
  FileCode2,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Compass,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/lib/auth";

const orderStatusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: "待支付", cls: "border-amber-500/40 text-amber-400" },
  paid: { label: "已支付", cls: "border-cyan-500/40 text-cyan-400" },
  completed: { label: "已交付", cls: "border-emerald-500/40 text-emerald-400" },
};

const solutionStatusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: "审核中", cls: "border-amber-500/40 text-amber-400" },
  approved: { label: "已上架", cls: "border-emerald-500/40 text-emerald-400" },
  rejected: { label: "未通过", cls: "border-rose-500/40 text-rose-400" },
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Account() {
  const { member, loading } = useAuth();
  const navigate = useNavigate();

  const ordersQuery = trpc.member.myOrders.useQuery(undefined, {
    enabled: !!member,
  });
  const solutionsQuery = trpc.member.mySolutions.useQuery(undefined, {
    enabled: !!member,
  });

  useEffect(() => {
    if (!loading && !member) navigate("/login");
  }, [loading, member, navigate]);

  if (loading || !member) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> 加载中…
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];
  const solutions = solutionsQuery.data ?? [];
  const totalSpent = orders.reduce((s, o) => s + o.price, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* 会员信息头 */}
      <div className="flex flex-wrap items-center gap-5 mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25">
          <User className="h-8 w-8 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {member.name}
            <span className="ml-3 text-sm font-normal text-slate-400">
              {member.company}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {fmtDate(member.createdAt)} 加入
          </p>
        </div>
        <div className="flex gap-6 text-center">
          <div>
            <div className="text-xl font-bold text-cyan-300">{orders.length}</div>
            <div className="text-xs text-slate-500">订单</div>
          </div>
          <div>
            <div className="text-xl font-bold text-cyan-300">
              ¥{totalSpent.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">累计交易额</div>
          </div>
          <div>
            <div className="text-xl font-bold text-cyan-300">
              {solutions.length}
            </div>
            <div className="text-xs text-slate-500">发布方案</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="bg-slate-900 border border-slate-800 mb-6">
          <TabsTrigger value="orders">
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" /> 我的订单
          </TabsTrigger>
          <TabsTrigger value="solutions">
            <FileCode2 className="h-3.5 w-3.5 mr-1.5" /> 我的方案
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="h-3.5 w-3.5 mr-1.5" /> 账号信息
          </TabsTrigger>
        </TabsList>

        {/* 订单 */}
        <TabsContent value="orders">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-0">
              {ordersQuery.isLoading ? (
                <div className="py-16 text-center text-slate-500">加载中…</div>
              ) : orders.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-500 mb-4">还没有购买记录</p>
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-500"
                    onClick={() => navigate("/marketplace")}
                  >
                    去方案集市逛逛
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">方案</TableHead>
                      <TableHead className="text-slate-400">金额</TableHead>
                      <TableHead className="text-slate-400">状态</TableHead>
                      <TableHead className="text-slate-400">下单时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow
                        key={o.id}
                        className="border-slate-800/60 hover:bg-slate-800/30"
                      >
                        <TableCell className="text-slate-200">
                          {o.solutionTitle}
                        </TableCell>
                        <TableCell className="text-cyan-300 font-medium">
                          ¥{o.price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              orderStatusMap[o.status]?.cls ?? "text-slate-400"
                            }
                          >
                            {orderStatusMap[o.status]?.label ?? o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {fmtDate(o.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 方案 */}
        <TabsContent value="solutions">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-0">
              {solutionsQuery.isLoading ? (
                <div className="py-16 text-center text-slate-500">加载中…</div>
              ) : solutions.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-500 mb-4">还没有发布过方案</p>
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-500"
                    onClick={() => navigate("/marketplace")}
                  >
                    去发布方案
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">方案名称</TableHead>
                      <TableHead className="text-slate-400">适用 MCU</TableHead>
                      <TableHead className="text-slate-400">定价</TableHead>
                      <TableHead className="text-slate-400">状态</TableHead>
                      <TableHead className="text-slate-400">提交时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solutions.map((s) => (
                      <TableRow
                        key={s.id}
                        className="border-slate-800/60 hover:bg-slate-800/30"
                      >
                        <TableCell className="text-slate-200">
                          {s.title}
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">
                          {s.mcu}
                        </TableCell>
                        <TableCell className="text-cyan-300 font-medium">
                          ¥{s.price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              solutionStatusMap[s.status]?.cls ??
                              "text-slate-400"
                            }
                          >
                            {solutionStatusMap[s.status]?.label ?? s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {fmtDate(s.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 账号信息 */}
        <TabsContent value="profile">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base">注册信息</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-5">
              {[
                { icon: User, label: "姓名", value: member.name },
                { icon: Mail, label: "邮箱", value: member.email },
                { icon: Phone, label: "手机号", value: member.phone },
                { icon: Building2, label: "公司", value: member.company },
                { icon: Briefcase, label: "职位", value: member.position || "—" },
                { icon: Compass, label: "技术方向", value: member.focusArea || "—" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                    <f.icon className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{f.label}</div>
                    <div className="text-sm text-slate-200">{f.value}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="text-xs text-slate-500 mt-4">
            如需修改注册信息，请联系 <span className="text-cyan-400">sales@sensor-hx.com</span>
            ，或<Link to="/products" className="text-cyan-400 hover:underline">提交需求</Link>。
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
