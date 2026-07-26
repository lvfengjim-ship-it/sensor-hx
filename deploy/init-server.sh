#!/bin/bash
# 阿里云服务器一键初始化（Ubuntu 22.04 / Alibaba Cloud Linux 3 通用）
# 用法：ssh root@<服务器IP> 后执行
#   curl -fsSL https://raw.githubusercontent.com/lvfengjim-ship-it/sensor-hx/main/deploy/init-server.sh | bash
set -e

echo "==> 安装 Docker（阿里云镜像加速）"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
  systemctl enable --now docker
fi
docker --version

echo "==> 安装 git"
if ! command -v git >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then apt-get update && apt-get install -y git
  elif command -v yum >/dev/null 2>&1; then yum install -y git
  fi
fi

echo "==> 克隆代码"
if [ ! -d ~/sensor-hx ]; then
  git clone https://github.com/lvfengjim-ship-it/sensor-hx.git ~/sensor-hx
fi
cd ~/sensor-hx && git pull

echo "==> 构建并启动（首次约 5-10 分钟）"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "==> 等待数据库就绪"
for i in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' sensor-hx-db 2>/dev/null || echo starting)
  [ "$status" = "healthy" ] && break
  sleep 5
done

echo "==> 初始化数据库表"
docker compose exec -T app npm run db:push

echo ""
echo "✅ 部署完成！容器状态："
docker compose ps
