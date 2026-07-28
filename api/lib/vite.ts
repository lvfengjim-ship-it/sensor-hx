import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  const distPath = path.resolve(import.meta.dirname, "../dist/public");

  // 缓存策略：
  // - /assets/* 为 Vite 指纹文件（哈希随内容变化），可永久缓存
  // - index.html / SPA 路由不缓存，保证部署后用户立即拿到新版本
  // - /images/* 等内容图文件名不变，短缓存 1 小时
  app.use("*", async (c, next) => {
    await next();
    if (c.res.status !== 200) return;
    const p = c.req.path;
    if (p.startsWith("/assets/")) {
      c.res.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
    } else if (p.startsWith("/images/")) {
      c.res.headers.set("Cache-Control", "public, max-age=3600");
    } else if (p === "/" || p.endsWith(".html") || !path.extname(p)) {
      // HTML 与 SPA 路由：不缓存，部署后立即生效
      c.res.headers.set("Cache-Control", "no-cache, must-revalidate");
    }
  });

  app.use("*", serveStatic({ root: "./dist/public" }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content, 200, {
      "Cache-Control": "no-cache, must-revalidate",
    });
  });
}
