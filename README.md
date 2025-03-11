# SKC API 服务

这是一个基于Node.js + Express的后端API服务，用于SKC系统的后台管理。

## 技术栈

- Node.js
- Express
- MySQL
- JWT认证
- bcrypt密码加密

## 项目结构

```
src/
  ├── config/           # 配置文件
  ├── controllers/      # 控制器
  ├── middlewares/      # 中间件
  ├── models/           # 数据模型
  ├── routes/           # 路由
  ├── utils/            # 工具函数
  ├── logs/             # 日志文件
  └── app.js            # 应用入口
```

## 安装与运行

### 前置条件

- Node.js (v14+)
- MySQL (v5.7+)

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制`.env.example`文件为`.env`，并根据实际情况修改配置：

```bash
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=skc
DB_PORT=3306

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 日志配置
LOG_LEVEL=info

# 限流配置
RATE_LIMIT_WINDOW_MS=15*60*1000  # 15分钟
RATE_LIMIT_MAX=100  # 每个IP在时间窗口内最多请求次数
```

### 运行开发环境

```bash
npm run dev
```

### 运行生产环境

```bash
npm start
```

## API文档

API文档详见 [api.md](api.md)

## 安全特性

- JWT认证
- 密码加密存储
- 请求参数验证
- API路由保护
- CORS配置
- SQL注入防护
- 接口限流

## 默认管理员账号

- 用户名：admin
- 密码：admin123

首次登录后请立即修改密码。

## 开发指南

### 添加新的API

1. 在`models/`目录下创建数据模型
2. 在`controllers/`目录下创建控制器
3. 在`routes/`目录下创建路由
4. 在`routes/index.js`中注册新路由

### 数据库初始化

系统启动时会自动初始化数据库和表结构，无需手动创建。

## 许可证

ISC 