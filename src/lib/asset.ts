// 静态资源路径：兼容根路径（Docker）与子路径（GitHub Pages）部署
export function asset(p: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
}
