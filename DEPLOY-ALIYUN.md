# 阿里云全栈部署指南（GitHub 推送即自动发布）

## 架构

```
Kimi 端口 / 开发者 ──push──► GitHub main ──触发──► GitHub Actions
                                                       │ SSH
                                                       ▼
                                    阿里云服务器（Docker，一次初始化）
                                     ├─ Caddy :80/:443（自动 HTTPS）
                                     ├─ app :3000（前端 + tRPC 后端）
                                     └─ MySQL :3306（仅本机可达）
                                    阿里云 DNS：www.sensor-hx.com → 服务器 IP
```

- 每次推送 `main` 分支，GitHub Actions 自动 SSH 到服务器执行
  `git pull && docker compose ... up -d --build`，约 2-3 分钟完成上线
- 3000/3306 端口只绑定 127.0.0.1，对外只暴露 80/443

## 一、购买服务器（约 5 分钟）

- 产品：**轻量应用服务器** 或 ECS，规格 **2C2G 起步**（建议 2C4G）
- 地域：离客户近的国内节点（已备案，可正常绑定域名）
- 镜像：**Ubuntu 22.04** 或 Alibaba Cloud Linux 3
- 防火墙/安全组：放行 **22、80、443**（22 建议限你的办公 IP）

## 二、服务器初始化（约 10 分钟，只做一次）

```bash
ssh root@<服务器IP>
curl -fsSL https://raw.githubusercontent.com/lvfengjim-ship-it/sensor-hx/main/deploy/init-server.sh | bash
```

脚本自动完成：装 Docker、装 git、克隆仓库、构建启动、建数据库表。
结束后 `docker compose ps` 应看到 db / app / caddy 三个容器运行中。

## 三、配置 GitHub Actions 自动部署（约 3 分钟，只做一次）

1. 在你本机生成一对部署密钥：

```bash
ssh-keygen -t ed25519 -f ~/.ssh/sensor-hx-deploy -N ""
ssh-copy-id -i ~/.ssh/sensor-hx-deploy.pub root@<服务器IP>
```

2. GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加三条：

| Secret 名 | 值 |
|---|---|
| `ALIYUN_HOST` | 服务器公网 IP |
| `ALIYUN_USER` | `root` |
| `ALIYUN_SSH_KEY` | `~/.ssh/sensor-hx-deploy`（私钥）的完整内容 |

## 三点五、配置 AI 密钥（AI 编程助手需要）

在服务器上创建 `~/sensor-hx/.env`（docker compose 会自动读取）：

    DEEPSEEK_API_KEY=<你的 DeepSeek Key>
    AI_PROVIDER=deepseek

然后 `cd ~/sensor-hx && docker compose up -d` 重启生效。
要改用 Mac Studio 本地算力，按 `deploy/ollama-tunnel/README.md` 配置后把
`AI_PROVIDER` 改为 `ollama`。

## 四、域名解析

1. 阿里云**云解析 DNS** → `sensor-hx.com` → 添加 A 记录：
   - 主机记录 `www` → 服务器公网 IP
   - 主机记录 `@` → 服务器公网 IP
2. 若之前把 NS 改到了 Cloudflare，改回阿里云默认 NS
   （域名管理 → 修改 DNS 服务器 → 使用万网 DNS）
3. Caddy 会自动申请 HTTPS 证书，几分钟后访问
   `https://www.sensor-hx.com` 验证

## 五、日常使用

- **发布**：任何端口推送代码到 GitHub `main`，Actions 自动部署，无需登录服务器
  （仓库 Actions 页可查看每次发布日志）
- **数据库结构变更**：推送后需手动执行一次
  `ssh root@<服务器IP> "cd ~/sensor-hx && docker compose exec -T app npm run db:push"`
- **手动部署/排查**：

```bash
ssh root@<服务器IP>
cd ~/sensor-hx
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose logs -f app        # 应用日志
docker compose logs -f caddy      # 网关日志
```

- **数据备份**：参考 DEPLOY-CHECKLIST.md 第 8 步的 crontab mysqldump

## 后续可选升级

- 数据库迁移到 **RDS MySQL**（改 `DATABASE_URL` 即可，应用无需改动）
- 接入 **云效 Flow** 替代 GitHub Actions（国内网络更稳）
- 多实例 + SLB 负载均衡
