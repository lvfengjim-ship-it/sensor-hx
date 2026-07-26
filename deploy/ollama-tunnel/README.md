# Mac Studio 算力通道：Ollama 远程调用配置模板

让阿里云服务器上的网站后端通过 Cloudflare Tunnel 调用 Mac Studio 的
Ollama 本地大模型（AI_PROVIDER=ollama 时启用）。

```
浏览器 → 阿里云 app（AI_PROVIDER=ollama）
          → https://ai.sensor-hx.com（Cloudflare Tunnel）
            → Mac Studio Caddy :11435（Bearer 密钥校验）
              → Ollama :11434（本地 31B 模型推理）
```

## 一、Mac Studio 上准备 Ollama

```bash
# 确认模型已安装（记录模型名，后面要用）
ollama list

# 确认服务在跑
curl http://localhost:11434/api/tags
```

## 二、Caddy 鉴权代理（不让 Ollama 裸奔）

```bash
brew install caddy

# 修改密钥：把 Caddyfile.ollama 里的 hx-ollama-secret-change-me
# 改成随机串（与服务器 .env 的 OLLAMA_API_KEY 相同）
openssl rand -hex 32   # 生成随机密钥

# 前台测试
caddy run --config deploy/ollama-tunnel/Caddyfile.ollama

# 验证：无密钥应 401，有密钥应返回模型列表
curl http://localhost:11435/v1/models
curl -H "Authorization: Bearer <你的密钥>" http://localhost:11435/v1/models

# 没问题后后台常驻
caddy start --config deploy/ollama-tunnel/Caddyfile.ollama
```

## 三、隧道增加 AI 入口

编辑 `~/.cloudflared/config.yml`，在 ingress 里**最前面**加一条：

```yaml
ingress:
  - hostname: ai.sensor-hx.com      # ← 新增：AI 算力入口
    service: http://localhost:11435
  - hostname: www.sensor-hx.com
    service: http://localhost:3000
  - hostname: sensor-hx.com
    service: http://localhost:3000
  - service: http_status:404
```

绑定 DNS 并重启隧道：

```bash
cloudflared tunnel route dns sensor-hx ai.sensor-hx.com
sudo cloudflared service install   # 已装过则：sudo launchctl kickstart -k system/com.cloudflare.cloudflared
```

外网验证：

```bash
curl -H "Authorization: Bearer <你的密钥>" https://ai.sensor-hx.com/v1/models
```

## 四、阿里云服务器启用 Ollama 通道

编辑服务器上 `~/sensor-hx/.env`：

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=https://ai.sensor-hx.com
OLLAMA_API_KEY=<第二步生成的密钥>
OLLAMA_MODEL=<ollama list 里的模型名>
```

重启应用：

```bash
cd ~/sensor-hx && docker compose up -d
```

切回 DeepSeek 只需把 `AI_PROVIDER` 改回 `deepseek` 再重启。

## 性能提示

- 31B 模型一次只能服务一个请求，多人同时用会排队，适合内部工具/演示
- Mac 的上行带宽决定吐字速度，建议上行 ≥ 30Mbps
- 生产环境高并发建议保持 DeepSeek 通道，Ollama 做备用/敏感代码专用
