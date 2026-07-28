import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

const FOCUS_AREAS = [
  { zh: "工业传感与测量", en: "Industrial Sensing & Measurement" },
  { zh: "电机控制", en: "Motor Control" },
  { zh: "电池管理 BMS", en: "Battery Management (BMS)" },
  { zh: "物联网通信", en: "IoT Communication" },
  { zh: "汽车电子", en: "Automotive Electronics" },
  { zh: "仪器仪表", en: "Instruments & Meters" },
  { zh: "其他", en: "Other" },
];

export default function Register() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { t } = useLang();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    focusArea: "",
    password: "",
    confirm: "",
  });

  const register = trpc.member.register.useMutation({
    onSuccess: (r) => {
      setSession(r.token, r.member);
      toast.success(t(`欢迎加入，${r.member.name}！会员注册成功`, `Welcome, ${r.member.name}! Registration successful`));
      navigate("/assistant");
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canSubmit =
    form.name &&
    form.email &&
    form.phone &&
    form.company &&
    form.password.length >= 6 &&
    form.password === form.confirm;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-14">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <UserPlus className="h-6 w-6 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl">{t("注册恒矽会员", "Join Hengxi Membership")}</CardTitle>
          <p className="text-sm text-slate-400 mt-2">
            {t(
              "注册后即可使用 AI 编程助手工作台、发布与购买方案",
              "Sign up to use the AI coding workspace, publish and purchase solutions",
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("姓名", "Name")} *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder={t("真实姓名", "Your full name")}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("手机号", "Phone")} *</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder={t("11 位手机号", "Mobile number")}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("邮箱", "Email")} *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder={t("用于登录与接收工程文件", "For login and receiving engineering files")}
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("公司名称", "Company")} *</Label>
              <Input
                value={form.company}
                onChange={(e) => set("company")(e.target.value)}
                placeholder={t("所在公司/团队", "Your company / team")}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("职位", "Position")}</Label>
              <Input
                value={form.position}
                onChange={(e) => set("position")(e.target.value)}
                placeholder={t("如：硬件工程师", "e.g. Hardware Engineer")}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("技术方向", "Technical Focus")}</Label>
            <Select value={form.focusArea} onValueChange={set("focusArea")}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder={t("选择主要技术方向", "Select your main focus")} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                {FOCUS_AREAS.map((a) => (
                  <SelectItem key={a.zh} value={a.zh}>
                    {t(a.zh, a.en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("密码", "Password")} *{t("（至少 6 位）", " (min 6 chars)")}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("确认密码", "Confirm Password")} *</Label>
              <Input
                type="password"
                value={form.confirm}
                onChange={(e) => set("confirm")(e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          {form.confirm && form.password !== form.confirm && (
            <p className="text-xs text-rose-400">{t("两次输入的密码不一致", "Passwords do not match")}</p>
          )}
          <Button
            className="w-full bg-cyan-600 hover:bg-cyan-500 h-11"
            disabled={!canSubmit || register.isPending}
            onClick={() =>
              register.mutate({
                name: form.name,
                email: form.email,
                phone: form.phone,
                company: form.company,
                position: form.position || undefined,
                focusArea: form.focusArea || undefined,
                password: form.password,
              })
            }
          >
            {register.isPending ? t("注册中…", "Signing up…") : t("注册并进入工作台", "Sign Up & Enter Workspace")}
          </Button>
          <p className="text-center text-sm text-slate-400">
            {t("已有账号？", "Already have an account?")}
            <Link to="/login" className="text-cyan-400 hover:underline ml-1">
              {t("直接登录", "Login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
