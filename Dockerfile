FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# 构建阶段需要 devDependencies（vite / esbuild / typescript），显式声明避免被省略
RUN npm ci --include=dev

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
