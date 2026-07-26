# 恒矽传感 Sensor-HX 官网

上海恒矽传感器有限公司官方网站（www.sensor-hx.com）—— 集产品资料、AI 编程助手与 MCU 方案交易平台于一体。

## 三大核心板块

| 板块 | 路径 | 说明 |
|------|------|------|
| 产品中心 | `/products` | 压力 / 温湿度 / 电流传感器与 MCU 产品资料，支持在线询价与数据手册索取 |
| AI 编程助手 | `/assistant` | 会员专享。面向 MCU 设计工程师的 AI 辅助工作台：需求描述 → 固件代码 → 引脚分配 → PCB 版图 → Gerber 打板文件（当前为演示交互，待接入大模型 API） |
| 方案集市 | `/marketplace` | MCU 经典编程集锦交易平台，会员可购买量产验证方案，也可发布自己的方案获得分成 |

## 会员体系

- 注册收集基础信息：姓名、邮箱、手机号、公司、职位、技术方向
- 邮箱 + 密码注册 / 登录，密码 scrypt 加盐哈希存储
- 登录态基于服务端会话令牌（30 天有效期）
- 数据库表：`members` / `sessions` / `inquiries` / `solutions` / `orders`

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：Hono + tRPC（端到端类型安全）
- **数据库**：MySQL + Drizzle ORM
- **部署**：Docker（见 `Dockerfile`）

## 本地开发

```bash
npm install
npm run db:push   # 同步数据库表结构（需配置 .env 中 DATABASE_URL）
npm run dev       # http://localhost:3000
```

## 构建与运行

```bash
npm run build
npm start         # 生产模式 http://localhost:3000
```

部署：

- **阿里云生产环境（推送 GitHub 即自动发布）**见 **[DEPLOY-ALIYUN.md](DEPLOY-ALIYUN.md)**
- Mac Studio 本地部署见 [DEPLOY.md](DEPLOY.md) 与 [DEPLOY-CHECKLIST.md](DEPLOY-CHECKLIST.md)
- GitHub Pages 静态预览见 [AGENTS.md](AGENTS.md)

## 目录结构

```
src/          前端页面与组件
  pages/      Home / Products / Assistant / Marketplace / Register / Login
  components/ Layout（导航+页脚）
  lib/        auth（会员认证上下文）
api/          Hono + tRPC 后端
  member.ts   会员注册/登录/询价/下单/发布方案
db/           Drizzle 数据库 schema 与迁移
contracts/    前后端共享类型
public/images/ 网站配图
```

## 后续规划

- [ ] AI 编程助手接入大模型 API（Kimi / DeepSeek），实现真实代码与版图生成
- [ ] 方案集市接入在线支付与文件交付
- [ ] 会员后台：我的订单、我的方案、资料下载记录
- [ ] 产品数据手册在线预览与下载
