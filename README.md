111# SKC 服务平台

SKC 服务平台是一个任务管理系统，支持多渠道任务分发、会员管理、收益结算等功能。

## 项目架构

该项目采用Node.js + Express + MySQL技术栈，分为管理端和H5端两个服务：

- 管理端 (Admin): 提供给管理员使用的后台管理系统API
- H5端 (H5): 提供给普通用户使用的移动端API

## 主要功能

- 会员管理：注册、登录、个人信息管理
- 任务管理：发布、参与、提交、审核任务
- 账号管理：多渠道账号管理
- 群组管理：群组创建、成员管理
- 收益管理：任务奖励、邀请奖励、提现管理
- 系统配置：灵活的系统参数配置

## 技术架构

- 后端框架：Express.js
- 数据库：MySQL
- 身份验证：JWT
- 文件存储：本地文件系统
- 部署：Docker, PM2

## 快速开始

### 环境要求

- Node.js >= 14.x
- MySQL >= 5.7
- Docker (可选)

### 安装依赖

```bash
npm install
```

### 环境配置

根据环境创建或修改以下环境变量文件：
- .env - 通用环境变量
- .env.admin - 管理端环境变量
- .env.h5 - H5端环境变量

### 启动服务

开发模式：
```bash
# 启动管理端服务
npm run dev:admin

# 启动H5端服务
npm run dev:h5

# 同时启动两个服务
npm run dev:all
```

生产模式：
```bash
# 启动管理端服务
npm run start:admin

# 启动H5端服务
npm run start:h5

# 同时启动两个服务
npm run start:all
```

### 数据库迁移

```bash
npm run migrate
```

## 部署

### 使用Docker

```bash
docker-compose up -d
```

### 使用PM2

```bash
pm2 start ecosystem.config.js
```

## 文档

详细文档请查看 `docs` 目录：

- [项目架构说明](docs/architecture.md)
- [业务规则说明](docs/business-rules.md)
- [数据库表结构说明](docs/database.md)
- [API文档说明](docs/api.md)

## 许可证

ISC 