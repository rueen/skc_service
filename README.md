# SKC Service

SKC Service 是一个支持管理后台和H5端的服务平台，提供任务管理、会员管理、渠道管理和文章管理等功能。

## 项目架构

项目采用同一代码库部署两个独立应用实例的架构：

- **管理后台**：提供给管理员使用的后台管理系统API
- **H5端**：提供给普通用户使用的H5应用API

两个应用共享数据模型和工具函数，但有独立的路由、控制器和中间件。

## 技术栈

- Node.js
- Express
- MySQL
- JWT认证
- Winston日志

## 目录结构

```
src/
├── shared/               # 共享代码
│   ├── app-common.js     # 共享的应用配置
│   ├── models/           # 数据模型（共享）
│   ├── utils/            # 工具函数（共享）
│   ├── config/           # 配置文件（共享）
│   ├── middlewares/      # 共享中间件
│   └── routes/           # 共享路由
├── admin/                # 管理后台代码
│   ├── admin-server.js   # 管理后台服务入口
│   ├── routes/           # 管理后台路由
│   ├── controllers/      # 管理后台控制器
│   └── middlewares/      # 管理后台中间件
├── h5/                   # H5端代码
│   ├── h5-server.js      # H5端服务入口
│   ├── routes/           # H5端路由
│   ├── controllers/      # H5端控制器
│   └── middlewares/      # H5端中间件
└── logs/                 # 日志文件
```

## 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7

## 安装

1. 克隆仓库

```bash
git clone https://github.com/yourusername/skc_service.git
cd skc_service
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

复制环境变量示例文件并根据需要修改：

```bash
cp .env.admin.example .env.admin
cp .env.h5.example .env.h5
```

4. 初始化数据库

确保MySQL服务已启动，并创建了相应的数据库。

## 启动服务

### 开发环境

启动管理后台服务：

```bash
npm run dev:admin
```

启动H5端服务：

```bash
npm run dev:h5
```

同时启动两个服务：

```bash
npm run dev:all
```

### 生产环境

启动管理后台服务：

```bash
npm run start:admin
```

启动H5端服务：

```bash
npm run start:h5
```

同时启动两个服务：

```bash
npm run start:all
```

## API文档

### 管理后台API

管理后台API基础路径：`/api/support`

- 认证相关：`/api/support/users`
- 任务管理：`/api/support/tasks`
- 会员管理：`/api/support/members`
- 渠道管理：`/api/support/channels`
- 群组管理：`/api/support/groups`
- 文章管理：`/api/support/articles`

### H5端API

H5端API基础路径：`/api/h5`

- 认证相关：`/api/h5/auth`
- 任务相关：`/api/h5/tasks`
- 会员相关：`/api/h5/members`
- 渠道相关：`/api/h5/channels`
- 文章相关：`/api/h5/articles`

## 部署

### 使用PM2

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start ecosystem.config.js
```

### 使用Docker

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

## 许可证

[MIT](LICENSE) 