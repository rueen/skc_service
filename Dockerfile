FROM node:16-alpine

# 创建应用目录
WORKDIR /app

# 安装应用依赖
# 使用通配符确保package.json和package-lock.json都被复制
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制应用代码
COPY . .

# 创建上传和日志目录
RUN mkdir -p uploads logs

# 设置权限
RUN chmod -R 755 uploads logs

# 暴露端口（将由环境变量覆盖）
EXPOSE 3000 3001

# 设置健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/health || exit 1

# 启动命令（将由docker-compose.yml中的command覆盖）
CMD ["npm", "start"] 