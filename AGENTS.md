# AGENTS.md — 恒矽传感官网维护指南

> 本文件面向所有参与本项目更新的 AI 助手 / 开发者端口。
> 目标：**任何改动完成后，必须同步推送到 GitHub 仓库 `lvfengjim-ship-it/sensor-hx` 的 `main` 分支。**

## 项目概览

上海恒矽传感器有限公司官网（www.sensor-hx.com），三大板块：

| 板块 | 路由 | 主要文件 |
|------|------|----------|
| 首页 | `/` | `src/pages/Home.tsx` |
| 产品中心 | `/products` | `src/pages/Products.tsx` |
| AI 编程助手（会员专享） | `/assistant` | `src/pages/Assistant.tsx` |
| 方案集市（交易平台） | `/marketplace` | `src/pages/Marketplace.tsx` |
| 注册 / 登录 | `/register` `/login` | `src/pages/Register.tsx` `Login.tsx` |

- 前端：React 19 + TypeScript + Vite + Tailwind + shadcn/ui（深色主题，青蓝色调）
- 后端：Hono + tRPC（`api/member.ts`：注册/登录/询价/下单/发布方案）
- 数据库：MySQL + Drizzle ORM（`db/schema.ts`：members / sessions / inquiries / solutions / orders）
- 会员认证：`src/lib/auth.tsx`，token 存 localStorage `hx_token`，请求头 `Authorization: Bearer`

## 常用命令

```bash
npm run check     # TypeScript 类型检查（提交前必须零错误）
npm run build     # 构建到 dist/
npm start         # 生产运行 http://localhost:3000
npm run db:push   # 数据库表结构同步（改了 db/schema.ts 后执行）
```

## 修改守则

1. **不要修改框架基础设施**：`api/lib/`、`api/queries/connection.ts`、`drizzle.config.ts`、`src/providers/trpc.tsx`、`.env`。
2. 新增后端接口：在 `api/` 新建 router，注册进 `api/router.ts`；输入必须用 zod 校验。
3. 新增数据库表：改 `db/schema.ts` → `npm run db:push`。**禁止 drop 表、禁止 `db:push --force`**。
4. 外键引用 `serial()` 主键时，必须用 `bigint("col", { mode: "number", unsigned: true })`。
5. 前端实体类型一律用 `typeof table.$inferSelect`，不要手写 Date 字段为 string。
6. 配图放 `public/images/`，页面内用 `/images/xxx.png` 引用。
7. 保持深色主题：页面背景 `bg-slate-950`，卡片 `bg-slate-900/60 border-slate-800`，主色 cyan。

## 推送 GitHub 规范（重要）

仓库：`https://github.com/lvfengjim-ship-it/sensor-hx`，默认分支 `main`。

```bash
# 1. 排除依赖与密钥后同步工作区
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .env --exclude .git \
  <项目目录>/ /tmp/sensor-hx/

# 2. 提交并推送
cd /tmp/sensor-hx
git add -A
git commit -m "简明中文提交信息：改了什么"
git push origin main
```

**严禁提交**：`node_modules/`、`dist/`、`.env`（含数据库与第三方凭证）。

提交信息规范：一句话说明改动内容，如「产品中心新增 HXP-4200 型号」「方案集市接入支付回调」。

## 路线图（待办）

- [ ] AI 助手接入大模型 API（Kimi / DeepSeek），代码与版图真实生成
- [ ] 方案集市在线支付 + 工程文件自动交付
- [ ] 会员后台：我的订单 / 我的方案 / 下载记录
- [ ] 产品真实型号与数据手册替换示例数据
