FROM node:20-alpine

WORKDIR /app

# 构建阶段强制开发模式，防止 npm 因 NODE_ENV=production 跳过 devDependencies
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# 兜底：构建工具缺失时显式补装（不修改 package.json），并自检
RUN test -f node_modules/.bin/vite || npm install --no-save --no-audit --no-fund vite esbuild
RUN ls node_modules/.bin/vite && node_modules/.bin/vite --version

COPY . .
RUN npm run build

# 运行阶段
ENV NODE_ENV=production

EXPOSE 3000
CMD ["npm", "start"]
