# 部署指南（Mac Studio）

## 最终架构

GitHub 只能托管静态页面（GitHub Pages 无 Node 运行环境、无数据库），
因此**后端 + 数据库部署在 Mac Studio**，前端由同一 Node 进程托管，单点部署。

```
┌───────────────────────────────────────────────┐
│ GitHub  lvfengjim-ship-it/sensor-hx           │
│  · main 分支     → 完整全栈源代码              │
│  · gh-pages 分支 → 静态预览（无后端，仅展示）   │
│    https://lvfengjim-ship-it.github.io/sensor-hx/
└───────┬───────────────────────────────────────┘
        │ git pull（更新代码）
        ▼
┌───────────────────────────────────────────────┐
│ Mac Studio（正式运行）                          │
│                                               │
│   用户 ──www.sensor-hx.com──► Node 服务 :3000  │
│                               ├─ 前端静态文件   │
│                               ├─ tRPC API      │
│                               └─► MySQL :3306  │
│                                   members / sessions /
│                                   inquiries / solutions / orders
└───────────────────────────────────────────────┘
```

## 方式 A：Docker 一键部署（推荐）

前置：Mac Studio 安装 [OrbStack](https://orbstack.dev) 或 Docker Desktop。

```bash
# 1. 拉取代码
git clone https://github.com/lvfengjim-ship-it/sensor-hx.git
cd sensor-hx

# 2. 修改 docker-compose.yml 中的 APP_SECRET 为随机长字符串（必做）

# 3. 构建并启动
docker compose up -d --build

# 4. 首次启动后建表（只做一次）
docker compose exec app npm run db:push

# 5. 验证
open http://localhost:3000
```

日常维护：

```bash
docker compose logs -f app      # 查看日志
docker compose restart app      # 重启应用
docker compose down             # 停止（数据保留在 db_data 卷中）
git pull && docker compose up -d --build   # 更新代码并重新部署
```

## 方式 B：不用 Docker 手动部署

```bash
# 1. 环境
brew install node@20 mysql
brew services start mysql

# 2. 建库
mysql -u root -e "CREATE DATABASE sensor_hx; \
  CREATE USER 'sensor'@'localhost' IDENTIFIED BY 'sensor_hx_pass_2026'; \
  GRANT ALL ON sensor_hx.* TO 'sensor'@'localhost';"

# 3. 配置
cp .env.example .env
# 编辑 .env：
#   APP_ID=sensor-hx
#   APP_SECRET=<随机长字符串>
#   DATABASE_URL=mysql://sensor:sensor_hx_pass_2026@localhost:3306/sensor_hx

# 4. 安装、建表、构建、启动
npm ci
npm run db:push
npm run build
npm start        # http://localhost:3000

# 后台常驻（可选）：npm i -g pm2 && pm2 start npm --name sensor-hx -- start
```

## 外网访问与域名（www.sensor-hx.com）

按网络条件二选一：

| 条件 | 方案 |
|------|------|
| 有公网 IP | 路由器端口映射 `80/443 → Mac Studio 3000`，域名 DNS 加 A 记录指向公网 IP |
| 无公网 IP | 内网穿透：Cloudflare Tunnel（推荐，免费自带 HTTPS）/ frp / 花生壳 |

HTTPS 建议在 Mac Studio 上用 [Caddy](https://caddyserver.com) 反向代理（自动申请证书）：

```
# Caddyfile
www.sensor-hx.com {
    reverse_proxy localhost:3000
}
```

## 数据备份

```bash
# Docker 方式
docker compose exec db mysqldump -usensor -psensor_hx_pass_2026 sensor_hx > backup_$(date +%F).sql

# 手动方式
mysqldump -usensor -psensor_hx_pass_2026 sensor_hx > backup_$(date +%F).sql
```

建议用 crontab 每日备份会员与订单数据。

## 更新流程（多端口协作）

1. 任意端口修改代码 → 推送 GitHub `main` 分支（规范见 `AGENTS.md`）
2. Mac Studio 上 `git pull && docker compose up -d --build`
3. 涉及数据库结构变更时：`docker compose exec app npm run db:push`
4. 需要刷新静态预览时按 `AGENTS.md` 中 GitHub Pages 一节操作
