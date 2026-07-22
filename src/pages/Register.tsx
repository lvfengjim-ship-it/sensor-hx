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

const FOCUS_AREAS = [
  "工业传感与测量",
  "电机控制",
  "电池管理 BMS",
  "物联网通信",
  "汽车电子",
  "仪器仪表",
  "其他",
];

export default function Register() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
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
      toast.success(`欢迎加入，${r.member.name}！会员注册成功`);
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
          <CardTitle className="text-2xl">注册恒矽会员</CardTitle>
          <p className="text-sm text-slate-400 mt-2">
            注册后即可使用 AI 编程助手工作台、发布与购买方案
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="真实姓名"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>手机号 *</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                placeholder="11 位手机号"
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>邮箱 *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              placeholder="用于登录与接收工程文件"
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>公司名称 *</Label>
              <Input
                value={form.company}
                onChange={(e) => set("company")(e.target.value)}
                placeholder="所在公司/团队"
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>职位</Label>
              <Input
                value={form.position}
                onChange={(e) => set("position")(e.target.value)}
                placeholder="如：硬件工程师"
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>技术方向</Label>
            <Select value={form.focusArea} onValueChange={set("focusArea")}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="选择主要技术方向" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                {FOCUS_AREAS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>密码 *（至少 6 位）</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password")(e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <div className="space-y-2">
              <Label>确认密码 *</Label>
              <Input
                type="password"
                value={form.confirm}
                onChange={(e) => set("confirm")(e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>
          {form.confirm && form.password !== form.confirm && (
            <p className="text-xs text-rose-400">两次输入的密码不一致</p>
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
            {register.isPending ? "注册中…" : "注册并进入工作台"}
          </Button>
          <p className="text-center text-sm text-slate-400">
            已有账号？
            <Link to="/login" className="text-cyan-400 hover:underline ml-1">
              直接登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
