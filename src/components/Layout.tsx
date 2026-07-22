import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useState } from "react";
import { Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const navItems = [
  { to: "/", label: "首页" },
  { to: "/products", label: "产品中心" },
  { to: "/assistant", label: "AI 编程助手" },
  { to: "/marketplace", label: "方案集市" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { member, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white p-1">
                <img src="/images/logo.png" alt="恒矽传感" className="h-full w-full object-contain" />
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
                    <LogOut className="h-4 w-4 mr-1" /> 退出
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
                    登录
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/register")}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    注册会员
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
                      会员中心（{member.name}）
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
                      退出
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
                      登录
                    </Button>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500"
                      onClick={() => {
                        setOpen(false);
                        navigate("/register");
                      }}
                    >
                      注册会员
                    </Button>
                  </>
                )}
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
                <img src="/images/logo.png" alt="" className="h-8 w-8" />
                <span className="font-bold">恒矽传感</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                专注传感器与嵌入式方案，为工程师提供从芯片选型、AI 辅助设计到成熟方案交易的一站式服务。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-slate-200">
                产品与服务
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/products" className="hover:text-cyan-300">传感器产品</Link></li>
                <li><Link to="/products" className="hover:text-cyan-300">MCU 与方案</Link></li>
                <li><Link to="/assistant" className="hover:text-cyan-300">AI 编程助手</Link></li>
                <li><Link to="/marketplace" className="hover:text-cyan-300">方案集市</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-slate-200">
                会员服务
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/register" className="hover:text-cyan-300">注册会员</Link></li>
                <li><Link to="/login" className="hover:text-cyan-300">会员登录</Link></li>
                <li><Link to="/assistant" className="hover:text-cyan-300">工程师工作台</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm text-slate-200">
                联系我们
              </h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>上海恒矽传感器有限公司</li>
                <li>网址：www.sensor-hx.com</li>
                <li>邮箱：sales@sensor-hx.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} 上海恒矽传感器有限公司 · www.sensor-hx.com · 版权所有
          </div>
        </div>
      </footer>
    </div>
  );
}
