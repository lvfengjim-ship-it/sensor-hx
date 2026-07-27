# 恒矽传感官网 · 阿里云 ECS/轻量服务器部署清单

> 目标：网站全栈跑在阿里云（前端+后端+MySQL），推送 GitHub 即自动发布。
> 预计耗时：40–60 分钟（含购买服务器）。

---

## 第 1 步：购买服务器（约 10 分钟）

- [ ] 产品：**轻量应用服务器**（或 ECS）
- [ ] 规格：**2C4G**（2 核 4G，50G ESSD，200M 峰值带宽不限流量）
- [ ] 地域：选离客户近的国内节点（域名已备案 ✓）
- [ ] 系统镜像：**Ubuntu 22.04 64位**
- [ ] 防火墙规则：放行 **22（SSH）、80（HTTP）、443（HTTPS）**
- [ ] 记下：**公网 IP**、root 密码（或重置密码）

> 也可选 ECS u1 实例 2C4G（固定 5M 带宽、续费同价），流程完全相同。

---

## 第 2 步：服务器初始化（约 10 分钟，只做一次）

```bash
ssh root@<服务器公网IP>

curl -fsSL https://raw.githubusercontent.com/lvfengjim-ship-it/sensor-hx/main/deploy/init-server.sh | bash
```

脚本自动完成：安装 Docker → 安装 git → 克隆仓库 → 构建启动 → 等待数据库就绪 → 建表。

验证：

```bash
docker compose ps
```

- [ ] `sensor-hx-db`、`sensor-hx-app`、`sensor-hx-caddy` 三个容器都在运行
- [ ] `curl http://localhost:3000` 有 HTML 返回

---

## 第 3 步：配置 AI 密钥（AI 编程助手需要）

```bash
cat > ~/sensor-hx/.env <<'EOF'
DEEPSEEK_API_KEY=<你的 DeepSeek Key>
AI_PROVIDER=deepseek
EOF
cd ~/sensor-hx && docker compose up -d
```

- [ ] `.env` 已创建，app 容器已重启

---

## 第 4 步：配置 GitHub Actions 自动部署（约 5 分钟，只做一次）

**① 在你 Mac 上生成部署密钥并授权到服务器：**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/sensor-hx-deploy -N ""
ssh-copy-id -i ~/.ssh/sensor-hx-deploy.pub root@<服务器公网IP>
```

**② GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret**，添加三条：

| Secret 名 | 值 |
|---|---|
| `ALIYUN_HOST` | 服务器公网 IP |
| `ALIYUN_USER` | `root` |
| `ALIYUN_SSH_KEY` | `cat ~/.ssh/sensor-hx-deploy` 输出的私钥全文 |

- [ ] 三条 Secrets 已添加

**③ 验证自动发布**：仓库 → Actions → "Deploy to Aliyun" → Run workflow 手动触发一次

- [ ] 运行绿色通过（约 2–3 分钟）

---

## 第 5 步：域名解析

- [ ] 阿里云**云解析 DNS** → `sensor-hx.com` → 添加记录：
  - A 记录，主机记录 `www` → 服务器公网 IP
  - A 记录，主机记录 `@` → 服务器公网 IP
- [ ] 若 NS 之前改到了 Cloudflare：域名管理 → 修改 DNS 服务器 → 改回**万网默认 DNS**

等解析生效（几分钟）：

- [ ] `https://www.sensor-hx.com` 可访问（Caddy 自动签 HTTPS 证书，首次访问稍等）
- [ ] 注册一个测试会员并登录成功
- [ ] 测试 AI 编程助手真实生成

---

## 日常使用

| 操作 | 命令 |
|---|---|
| 发布更新 | 任何端口 `git push` 到 main，Actions 自动部署 |
| 查看发布日志 | GitHub 仓库 → Actions 页 |
| 数据库结构变更后 | `ssh root@<IP> "cd ~/sensor-hx && docker compose exec -T app npm run db:push"` |
| 查看应用日志 | `ssh root@<IP> "cd ~/sensor-hx && docker compose logs -f app"` |
| 每日备份数据库 | 见下方 crontab |

**数据库每日备份（在服务器上执行一次）：**

```bash
mkdir -p ~/backups
(crontab -l 2>/dev/null; echo '0 3 * * * cd ~/sensor-hx && docker compose exec -T db mysqldump -usensor -psensor_hx_pass_2026 sensor_hx > ~/backups/backup_$(date +\%F).sql') | crontab -
```

---

## 常见问题

| 现象 | 处理 |
|------|------|
| Actions 部署失败：ssh 握手超时 | 检查服务器安全组是否放行 22 给 GitHub；Secrets 的 IP/私钥是否正确 |
| HTTPS 证书没签下来 | 确认 80/443 已放行且 DNS 已生效；`docker compose logs caddy` 看原因 |
| 页面 502 | `docker compose ps` 确认 app 在跑；`docker compose restart app` |
| AI 生成报错 | 检查 `~/sensor-hx/.env` 里 Key 是否正确；`docker compose logs app` 看 DeepSeek 返回 |
| 数据库连不上 | 确认 `db` 容器 healthy；参考 DEPLOY.md 常见问题 |
