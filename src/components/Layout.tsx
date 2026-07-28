import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useState } from "react";
import { Menu, X, User, LogOut, Phone, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { asset } from "@/lib/asset";
import { useLang } from "@/lib/i18n";

/** 中英文切换按钮 */
function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      className={`inline-flex items-center gap-1 rounded-md border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors ${
        compact ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs"
      }`}
      aria-label="Switch language / 切换语言"
    >
      <Languages className="h-3.5 w-3.5 text-cyan-400" />
      {lang === "zh" ? "EN" : "中文"}
    </button>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { member, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();

  const navItems = [
    { to: "/", label: t("首页", "Home") },
    { to: "/products", label: t("产品中心", "Products") },
    { to: "/assistant", label: t("AI 编程助手", "AI Assistant") },
    { to: "/marketplace", label: t("方案集市", "Marketplace") },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1">
                <img src={asset("images/logo.png")} alt="恒矽传感" className="h-full w-full object-contain" />
              </span>
              <div className="leading-tight">
                <div className="font-bold text-base tracking-wide">
                  恒矽传感
                </div>
                <div className="text-[10px] text-cyan-400 tracking-widest">
                  SENSOR-HX.COM
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "text-cyan-300 bg-cyan-500/10"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <a
                href="tel:4001101289"
                className="hidden lg:inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-cyan-300 transition-colors mr-1"
              >
                <Phone className="h-4 w-4 text-cyan-400" />
                <span className="font-medium tracking-wide">400-110-1289</span>
              </a>
              <LangToggle />
              {member ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/account"
                    className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    <User className="h-4 w-4 text-cyan-400" />
                    {member.name}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <LogOut className="h-4 w-4 mr-1" /> {t("退出", "Logout")}
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/login")}
                    className="text-slate-300 hover:text-white"
                  >
                    {t("登录", "Login")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/register")}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    {t("注册会员", "Sign Up")}
                  </Button>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2 text-slate-300"
              onClick={() => setOpen(!open)}
              aria-label="菜单"
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {open && (
            <div className="md:hidden pb-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2.5 rounded-md text-sm ${
                      isActive
                        ? "text-cyan-300 bg-cyan-500/10"
                        : "text-slate-300 hover:bg-slate-800"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-2 flex gap-2 px-4">
                {member ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
                      onClick={() => {
                        setOpen(false);
                        navigate("/account");
                      }}
                    >
                      {t("会员中心", "Account")}（{member.name}）
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400"
                      onClick={() => {
                        logout();
                        setOpen(false);
                        navigate("/");
                      }}
                    >
                      {t("退出", "Logout")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"
                      onClick={() => {
                        setOpen(false);
                        navigate("/login");
                      }}
                    >
                      {t("登录", "Login")}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500"
                      onClick={() => {
                        setOpen(false);
                        navigate("/register");
                      }}
                    >
                      {t("注册会员", "Sign Up")}
                    </Button>
                  </>
                )}
                <LangToggle compact />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 页面内容 */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={asset("images/logo.png")} alt="" className="h-8 w-8" />
                <span className="font-bold">恒矽传感</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                {t(
                  "专注芯片销售与嵌入式方案，为工程师提供从芯片选型、AI 辅助设计到成熟方案交易的一站式服务。",
                  "Focused on chip sales and embedded solutions — a one-stop service from chip selection and AI-assisted design to proven solution trading.",
                )}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-slate-200">
                {t("产品与服务", "Products & Services")}
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/products" className="hover:text-cyan-300">{t("传感器产品", "Sensors")}</Link></li>
                <li><Link to="/products" className="hover:text-cyan-300">{t("MCU 与方案", "MCU & Solutions")}</Link></li>
                <li><Link to="/assistant" className="hover:text-cyan-300">{t("AI 编程助手", "AI Assistant")}</Link></li>
                <li><Link to="/marketplace" className="hover:text-cyan-300">{t("方案集市", "Marketplace")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-slate-200">
                {t("会员服务", "Membership")}
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/register" className="hover:text-cyan-300">{t("注册会员", "Sign Up")}</Link></li>
                <li><Link to="/login" className="hover:text-cyan-300">{t("会员登录", "Member Login")}</Link></li>
                <li><Link to="/assistant" className="hover:text-cyan-300">{t("工程师工作台", "Engineer Workspace")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-slate-200">
                {t("联系我们", "Contact Us")}
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>{t("上海恒矽传感器有限公司", "Shanghai Hengxi Sensor Co., Ltd.")}</li>
                <li>
                  <a
                    href="tel:4001101289"
                    className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {t("服务热线", "Hotline")}: 400-110-1289
                  </a>
                </li>
                <li>{t("网址", "Web")}: www.sensor-hx.com</li>
                <li>{t("邮箱", "Email")}: sales@sensor-hx.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {t("上海恒矽传感器有限公司", "Shanghai Hengxi Sensor Co., Ltd.")} · www.sensor-hx.com · {t("版权所有", "All rights reserved")}
          </div>
        </div>
      </footer>
    </div>
  );
}
