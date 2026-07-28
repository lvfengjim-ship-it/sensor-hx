import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  Users,
  Activity,
  FileText,
  Package,
  ShoppingCart,
  Cpu,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "members" | "sessions" | "inquiries" | "solutions" | "orders" | "ai";

function fmt(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

export default function Admin() {
  const { t } = useLang();
  const [key, setKey] = useState(localStorage.getItem("hx-admin-key") ?? "");
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<Tab>("members");

  const verify = trpc.admin.verify.useQuery(undefined, {
    enabled: !!key,
    retry: false,
  });
  const authed = !!key && verify.isSuccess;

  const overview = trpc.admin.overview.useQuery(undefined, { enabled: authed });
  const membersQ = trpc.admin.members.useQuery(undefined, { enabled: authed && tab === "members" });
  const sessionsQ = trpc.admin.activeSessions.useQuery(undefined, { enabled: authed && tab === "sessions" });
  const inquiriesQ = trpc.admin.inquiries.useQuery(undefined, { enabled: authed && tab === "inquiries" });
  const solutionsQ = trpc.admin.solutions.useQuery(undefined, { enabled: authed && tab === "solutions" });
  const ordersQ = trpc.admin.orders.useQuery(undefined, { enabled: authed && tab === "orders" });
  const aiQ = trpc.admin.aiUsage.useQuery(undefined, { enabled: authed && tab === "ai" });

  const review = trpc.admin.reviewSolution.useMutation({
    onSuccess: () => {
      toast.success(t("审核状态已更新", "Review status updated"));
      solutionsQ.refetch();
      overview.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const login = () => {
    const k = input.trim();
    if (!k) return;
    localStorage.setItem("hx-admin-key", k);
    setKey(k);
  };
  const logout = () => {
    localStorage.removeItem("hx-admin-key");
    setKey("");
    setInput("");
  };

  /* ---------- 密钥门禁 ---------- */
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              {t("管理后台", "Admin Console")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              {t("请输入管理密钥进入后台。", "Enter the admin key to continue.")}
            </p>
            <Input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder={t("管理密钥", "Admin key")}
              className="bg-slate-950 border-slate-700 text-slate-200"
            />
            {key && verify.isError && (
              <p className="text-sm text-red-400">
                {t("密钥无效，请检查后重试。", "Invalid key, please try again.")}
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={login} className="flex-1 bg-cyan-600 hover:bg-cyan-500">
                {t("进入后台", "Sign in")}
              </Button>
              <Button variant="outline" onClick={() => (location.href = "/")}>
                {t("返回首页", "Home")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ov = overview.data;
  const solCount = (s: string) => ov?.solutionByStatus.find((x) => x.status === s)?.c ?? 0;
  const orderAmount = (s: string) => ov?.orderStats.find((x) => x.status === s)?.amount ?? 0;
  const orderCount = (s: string) => ov?.orderStats.find((x) => x.status === s)?.c ?? 0;

  const stats = [
    { icon: Users, label: t("注册会员", "Members"), value: ov?.memberTotal ?? "…", sub: t(`近30天 +${ov?.memberNew30 ?? 0}`, `+${ov?.memberNew30 ?? 0} in 30d`) },
    { icon: Activity, label: t("有效会话", "Active sessions"), value: ov?.activeSessions ?? "…", sub: t("30 天内登录有效", "valid logins") },
    { icon: FileText, label: t("询价记录", "Inquiries"), value: ov?.inquiryTotal ?? "…", sub: t("产品询价/资料索取", "product inquiries") },
    { icon: Package, label: t("待审方案", "Pending solutions"), value: solCount("pending"), sub: t(`已上架 ${solCount("approved")} · 驳回 ${solCount("rejected")}`, `approved ${solCount("approved")} · rejected ${solCount("rejected")}`) },
    { icon: ShoppingCart, label: t("订单总额", "Order amount"), value: `¥${orderAmount("paid") + orderAmount("completed") + orderAmount("pending")}`, sub: t(`共 ${orderCount("paid") + orderCount("completed") + orderCount("pending")} 单`, `${orderCount("paid") + orderCount("completed") + orderCount("pending")} orders`) },
    { icon: Cpu, label: t("AI 生成（30天）", "AI generations (30d)"), value: ov?.ai30 ?? "…", sub: t(`7天 ${ov?.ai7 ?? 0} 次 · 失败 ${ov?.aiFail30 ?? 0}`, `7d ${ov?.ai7 ?? 0} · failed ${ov?.aiFail30 ?? 0}`) },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: "members", label: t("注册客户", "Members") },
    { key: "sessions", label: t("有效会话", "Sessions") },
    { key: "inquiries", label: t("询价记录", "Inquiries") },
    { key: "solutions", label: t("方案审核", "Solutions") },
    { key: "orders", label: t("订单", "Orders") },
    { key: "ai", label: t("AI 使用", "AI usage") },
  ];

  const th = "px-3 py-2 text-left text-xs font-medium text-slate-500 border-b border-slate-800";
  const td = "px-3 py-2 text-sm text-slate-300 border-b border-slate-800/60 align-top";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          {t("恒矽传感 · 管理后台", "Sensor-HX Admin")}
        </h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { overview.refetch(); membersQ.refetch(); sessionsQ.refetch(); inquiriesQ.refetch(); solutionsQ.refetch(); ordersQ.refetch(); aiQ.refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-1" /> {t("刷新", "Refresh")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => (location.href = "/")}>
            {t("返回网站", "Back to site")}
          </Button>
          <Button size="sm" variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-1" /> {t("退出", "Sign out")}
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="bg-slate-900/60 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <s.icon className="h-4 w-4 text-cyan-500" /> {s.label}
                </div>
                <div className="text-2xl font-semibold text-cyan-300 mt-1">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI 引擎分布 */}
        {ov && ov.aiByProvider.length > 0 && (
          <p className="text-xs text-slate-500">
            {t("近 30 天 AI 引擎分布：", "AI engines (30d): ")}
            {ov.aiByProvider.map((p) => `${p.provider || "unknown"} × ${p.c}`).join(" · ")}
          </p>
        )}

        {/* 页签 */}
        <div className="flex gap-1 border-b border-slate-800 overflow-x-auto">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
                tab === tb.key
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          {tab === "members" && (
            <table className="w-full">
              <thead><tr>
                <th className={th}>ID</th><th className={th}>{t("姓名", "Name")}</th>
                <th className={th}>{t("邮箱", "Email")}</th><th className={th}>{t("电话", "Phone")}</th>
                <th className={th}>{t("公司", "Company")}</th><th className={th}>{t("职位", "Position")}</th>
                <th className={th}>{t("技术方向", "Focus")}</th><th className={th}>{t("订单", "Orders")}</th>
                <th className={th}>{t("AI 次数", "AI uses")}</th><th className={th}>{t("最近登录", "Last login")}</th>
                <th className={th}>{t("注册时间", "Registered")}</th>
              </tr></thead>
              <tbody>
                {(membersQ.data ?? []).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40">
                    <td className={td}>{m.id}</td><td className={td}>{m.name}</td>
                    <td className={td}>{m.email}</td><td className={td}>{m.phone}</td>
                    <td className={td}>{m.company}</td><td className={td}>{m.position || "—"}</td>
                    <td className={td}>{m.focusArea || "—"}</td><td className={td}>{m.orderCount}</td>
                    <td className={td}>{m.aiCount}</td><td className={td}>{fmt(m.lastLogin)}</td>
                    <td className={td}>{fmt(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "sessions" && (
            <table className="w-full">
              <thead><tr>
                <th className={th}>{t("会员", "Member")}</th><th className={th}>{t("邮箱", "Email")}</th>
                <th className={th}>{t("公司", "Company")}</th><th className={th}>{t("登录时间", "Login at")}</th>
                <th className={th}>{t("会话过期", "Expires")}</th>
              </tr></thead>
              <tbody>
                {(sessionsQ.data ?? []).map((s) => (
                  <tr key={s.sessionId} className="hover:bg-slate-900/40">
                    <td className={td}>{s.name}</td><td className={td}>{s.email}</td>
                    <td className={td}>{s.company}</td><td className={td}>{fmt(s.createdAt)}</td>
                    <td className={td}>{fmt(s.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "inquiries" && (
            <table className="w-full">
              <thead><tr>
                <th className={th}>{t("产品", "Product")}</th><th className={th}>{t("联系方式", "Contact")}</th>
                <th className={th}>{t("留言", "Message")}</th><th className={th}>{t("会员", "Member")}</th>
                <th className={th}>{t("时间", "Time")}</th>
              </tr></thead>
              <tbody>
                {(inquiriesQ.data ?? []).map((q) => (
                  <tr key={q.id} className="hover:bg-slate-900/40">
                    <td className={td}>{q.productName}</td><td className={td}>{q.contact}</td>
                    <td className={`${td} max-w-xs`}>{q.message || "—"}</td>
                    <td className={td}>{q.memberName ? `${q.memberName} (${q.memberEmail})` : t("访客", "Guest")}</td>
                    <td className={td}>{fmt(q.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "solutions" && (
            <table className="w-full">
              <thead><tr>
                <th className={th}>ID</th><th className={th}>{t("标题", "Title")}</th>
                <th className={th}>MCU</th><th className={th}>{t("价格", "Price")}</th>
                <th className={th}>{t("发布者", "Author")}</th><th className={th}>{t("状态", "Status")}</th>
                <th className={th}>{t("时间", "Time")}</th><th className={th}>{t("操作", "Actions")}</th>
              </tr></thead>
              <tbody>
                {(solutionsQ.data ?? []).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40">
                    <td className={td}>{s.id}</td><td className={td}>{s.title}</td>
                    <td className={td}>{s.mcu}</td><td className={td}>¥{s.price}</td>
                    <td className={td}>{s.memberName} ({s.memberEmail})</td>
                    <td className={td}>
                      {s.status === "pending" ? (
                        <span className="text-amber-400">{t("待审核", "Pending")}</span>
                      ) : s.status === "approved" ? (
                        <span className="text-emerald-400">{t("已上架", "Approved")}</span>
                      ) : (
                        <span className="text-red-400">{t("已驳回", "Rejected")}</span>
                      )}
                    </td>
                    <td className={td}>{fmt(s.createdAt)}</td>
                    <td className={td}>
                      {s.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-7 bg-emerald-700 hover:bg-emerald-600" onClick={() => review.mutate({ id: s.id, status: "approved" })}>
                            {t("通过", "Approve")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7" onClick={() => review.mutate({ id: s.id, status: "rejected" })}>
                            {t("驳回", "Reject")}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "orders" && (
            <table className="w-full">
              <thead><tr>
                <th className={th}>ID</th><th className={th}>{t("方案", "Solution")}</th>
                <th className={th}>{t("金额", "Amount")}</th><th className={th}>{t("买家", "Buyer")}</th>
                <th className={th}>{t("状态", "Status")}</th><th className={th}>{t("时间", "Time")}</th>
              </tr></thead>
              <tbody>
                {(ordersQ.data ?? []).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-900/40">
                    <td className={td}>{o.id}</td><td className={td}>{o.solutionTitle}</td>
                    <td className={td}>¥{o.price}</td>
                    <td className={td}>{o.memberName} ({o.memberEmail})</td>
                    <td className={td}>{o.status}</td><td className={td}>{fmt(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "ai" && (
            <table className="w-full">
              <thead><tr>
                <th className={th}>{t("会员", "Member")}</th><th className={th}>MCU</th>
                <th className={th}>{t("引擎", "Engine")}</th><th className={th}>{t("耗时", "Duration")}</th>
                <th className={th}>{t("结果", "Result")}</th><th className={th}>{t("时间", "Time")}</th>
              </tr></thead>
              <tbody>
                {(aiQ.data ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/40">
                    <td className={td}>{u.memberName ? `${u.memberName} (${u.memberEmail})` : "—"}</td>
                    <td className={td}>{u.mcu}</td><td className={td}>{u.provider || "—"}</td>
                    <td className={td}>{(u.durationMs / 1000).toFixed(0)}s</td>
                    <td className={td}>
                      {u.ok ? (
                        <span className="text-emerald-400">{t("成功", "OK")}</span>
                      ) : (
                        <span className="text-red-400" title={u.error ?? ""}>{t("失败", "Failed")}</span>
                      )}
                    </td>
                    <td className={td}>{fmt(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
