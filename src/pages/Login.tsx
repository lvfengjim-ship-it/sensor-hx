import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export default function Login() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = trpc.member.login.useMutation({
    onSuccess: (r) => {
      setSession(r.token, r.member);
      toast.success(t(`欢迎回来，${r.member.name}`, `Welcome back, ${r.member.name}`));
      navigate("/assistant");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-20">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <LogIn className="h-6 w-6 text-cyan-400" />
          </div>
          <CardTitle className="text-2xl">{t("会员登录", "Member Login")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("邮箱", "Email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("注册时使用的邮箱", "The email you registered with")}
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("密码", "Password")}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                email &&
                password &&
                login.mutate({ email, password })
              }
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <Button
            className="w-full bg-cyan-600 hover:bg-cyan-500 h-11"
            disabled={!email || !password || login.isPending}
            onClick={() => login.mutate({ email, password })}
          >
            {login.isPending ? t("登录中…", "Logging in…") : t("登录", "Login")}
          </Button>
          <p className="text-center text-sm text-slate-400">
            {t("还没有账号？", "No account yet?")}
            <Link to="/register" className="text-cyan-400 hover:underline ml-1">
              {t("免费注册", "Sign up free")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
