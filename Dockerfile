FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json ./

# 1. 升级 npm：node:20-alpine 自带 npm 10.8.2 存在
#    "Exit handler never called" 崩溃 bug（崩溃后退出码仍为 0，导致静默安装失败）
RUN npm install -g npm@11 --no-audit --no-fund

# 2. 切换国内镜像源，避免拉取 tarball 时网络中断（integrity 校验不受影响）
RUN npm config set registry https://registry.npmmirror.com \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && sed -i 's#https://registry.npmjs.org#https://registry.npmmirror.com#g' package-lock.json

# 3. 安装并自检（vite 必须存在且能运行，否则构建立即失败暴露问题）
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
RUN ls node_modules/.bin/vite && node_modules/.bin/vite --version

COPY . .
# 显式以生产模式构建（Vite 默认继承 NODE_ENV，全局 development 会导致打出开发版 bundle）
RUN NODE_ENV=production npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
