FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=development

COPY package.json package-lock.json ./

# 安装并输出完整诊断信息（不因失败中断，确保信息可见）
RUN npm ci --no-audit --no-fund; \
    echo "== npm: $(npm --version)  node: $(node --version)"; \
    echo "== omit: $(npm config get omit)  ignore-scripts: $(npm config get ignore-scripts)  bin-links: $(npm config get bin-links)"; \
    echo "== registry: $(npm config get registry)"; \
    echo "== node_modules 包数: $(ls node_modules 2>/dev/null | wc -l)"; \
    echo "== .bin 条目数: $(ls node_modules/.bin 2>/dev/null | wc -l)"; \
    ls -la node_modules/.bin 2>/dev/null | head -15; \
    ls -d node_modules/vite 2>/dev/null || echo "!! vite 包未安装"

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
