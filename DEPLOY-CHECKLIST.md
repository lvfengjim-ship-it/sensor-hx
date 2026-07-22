# 恒矽传感官网 · Mac Studio 首次部署清单

> 目标：在 Mac Studio 上用 Docker 跑起完整网站（前端 + 后端 + MySQL），
> 后续可选接外网域名 www.sensor-hx.com。
> 预计耗时：30–45 分钟（主要是首次下载镜像）。

---

## 第 0 步：确认环境

- [ ] Mac Studio 已联网
- [ ] 打开「终端」（Terminal）

检查是否已安装 Homebrew：

```bash
brew --version
```

- 有版本号 → 跳到第 1 步
- 提示 command not found → 先安装 Homebrew：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

---

## 第 1 步：安装 OrbStack（Docker 运行环境）

```bash
brew install orbstack
open -a OrbStack
```

首次打开按提示完成初始化（一路默认即可）。验证：

```bash
docker version
docker compose version
```

- [ ] 两条命令都有输出，无报错

> 建议：OrbStack → Settings → General → 勾选 **Start at login**（开机自启）。

---

## 第 2 步：拉取网站代码

```bash
cd ~
git clone https://github.com/lvfengjim-ship-it/sensor-hx.git
cd sensor-hx
```

- [ ] `ls` 能看到 `docker-compose.yml`、`Dockerfile`、`src/`、`api/` 等文件

---

## 第 3 步：修改安全密钥（必做）

生成一个随机密钥：

```bash
openssl rand -hex 32
```

复制输出的字符串，然后编辑配置：

```bash
nano docker-compose.yml
```

找到这一行，把密钥粘贴进去：

```yaml
APP_SECRET: hx-secret-please-change-me   # ← 替换成刚才生成的随机字符串
```

> 建议同时把 `MYSQL_PASSWORD` 和 `DATABASE_URL` 里的 `sensor_hx_pass_2026` 改成你自己的密码（两处要保持一致）。

保存：按 `Ctrl+O` → 回车 → `Ctrl+X` 退出。

- [ ] APP_SECRET 已替换为随机字符串
- [ ] （可选）MySQL 密码已修改且两处一致

---

## 第 4 步：构建并启动

```bash
docker compose up -d --build
```

首次运行需下载镜像并编译，约 5–10 分钟。看到这两行即成功：

```
✔ Container sensor-hx-db   Started
✔ Container sensor-hx-app  Started
```

确认两个容器都在运行：

```bash
docker compose ps
```

- [ ] `sensor-hx-db` 状态为 `running (healthy)`
- [ ] `sensor-hx-app` 状态为 `running`

---

## 第 5 步：初始化数据库（只做这一次）

```bash
docker compose exec app npm run db:push
```

看到 `Changes applied` 即建表完成。

- [ ] 输出中包含 `Changes applied`

---

## 第 6 步：验证网站

```bash
open http://localhost:3000
```

逐项验证：

- [ ] 首页正常打开，能看到 Logo 和 Banner
- [ ] 「产品中心」「AI 编程助手」「方案集市」页面都能打开
- [ ] 点「注册会员」，填写信息提交，能注册成功并跳转到工作台
- [ ] 导航栏出现你的用户名，点进去能看到「会员中心」

验证数据真的进了数据库（可选）：

```bash
docker compose exec db mysql -usensor -psensor_hx_pass_2026 sensor_hx -e "SELECT id,name,email,company FROM members;"
```

- [ ] 能看到刚注册的会员记录

> 到这里，本地部署已完成。以下第 7–9 步为可选项。

---

## 第 7 步（可选）：绑定域名 www.sensor-hx.com 对外访问

### 方案 1：有公网 IP

1. 路由器设置端口映射：外网 `80` 和 `443` → Mac Studio 内网 IP 的 `3000`
2. 域名服务商处添加 A 记录：`www` → 你的公网 IP
3. HTTPS 用 Caddy 自动证书：

```bash
brew install caddy
sudo caddy reverse-proxy --from www.sensor-hx.com --to localhost:3000
```

### 方案 2：无公网 IP（推荐 Cloudflare Tunnel，免费自带 HTTPS）

```bash
brew install cloudflared
cloudflared tunnel login                 # 浏览器打开完成授权（需域名已托管到 Cloudflare）
cloudflared tunnel create sensor-hx      # 记下输出的 Tunnel ID 和凭证文件路径
```

创建配置文件 `~/.cloudflared/config.yml`：

```yaml
tunnel: <你的Tunnel-ID>
credentials-file: /Users/<你的用户名>/.cloudflared/<你的Tunnel-ID>.json
ingress:
  - hostname: www.sensor-hx.com
    service: http://localhost:3000
  - service: http_status:404
```

绑定域名并启动：

```bash
cloudflared tunnel route dns sensor-hx www.sensor-hx.com
cloudflared tunnel run sensor-hx
```

- [ ] 外网浏览器访问 `https://www.sensor-hx.com` 能打开网站

---

## 第 8 步（可选）：每日自动备份数据库

```bash
mkdir -p ~/sensor-hx-backups
crontab -e
```

添加一行（每天凌晨 3 点备份）：

```
0 3 * * * docker compose -f ~/sensor-hx/docker-compose.yml exec -T db mysqldump -usensor -psensor_hx_pass_2026 sensor_hx > ~/sensor-hx-backups/backup_$(date +\%F).sql
```

---

## 日常更新（以后每次网站升级后执行）

```bash
cd ~/sensor-hx
git pull
docker compose up -d --build
```

若提示有数据库结构变更，再执行一次：

```bash
docker compose exec app npm run db:push
```

---

## 常见问题

| 现象 | 处理 |
|------|------|
| `docker: command not found` | OrbStack 没启动：`open -a OrbStack` |
| 3000 端口被占用 | `lsof -ti:3000` 查到进程后关掉，或改 compose 里端口为 `"8080:3000"` |
| 页面能打开但注册报错 | 数据库没建表，执行第 5 步 |
| `docker compose ps` 里 db 不是 healthy | 等 30 秒再看；仍异常执行 `docker compose logs db` |
| 想清空重来 | `docker compose down -v`（⚠️ 会删除所有会员数据） |
