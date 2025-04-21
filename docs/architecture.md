# SKC 服务平台 - 项目架构说明

## 整体架构

SKC 服务平台采用前后端分离的架构，后端基于 Node.js + Express 框架开发，分为两个子服务：

1. **Admin服务**：为管理员提供后台管理功能的API服务
2. **H5服务**：为普通用户提供移动端功能的API服务

整体技术栈：
- **后端**：Node.js + Express
- **数据库**：MySQL
- **认证**：JWT (JSON Web Token)
- **日志**：Winston
- **任务调度**：Node-cron
- **API限速**：express-rate-limit
- **安全防护**：helmet, bcrypt
- **文件上传**：multer
- **部署**：Docker, PM2

## 目录结构

```
skc_service/
├── .env                  # 环境变量（通用）
├── .env.admin            # 管理端环境变量
├── .env.h5               # H5端环境变量
├── docs/                 # 项目文档
├── migrations/           # 数据库迁移脚本
├── nginx/                # Nginx配置
├── scripts/              # 工具脚本
├── src/
│   ├── admin/            # 管理端服务
│   │   ├── admin-server.js     # 管理端服务入口
│   │   ├── controllers/        # 管理端控制器
│   │   └── routes/             # 管理端路由
│   ├── h5/               # H5端服务
│   │   ├── h5-server.js        # H5端服务入口
│   │   ├── controllers/        # H5端控制器
│   │   └── routes/             # H5端路由
│   └── shared/           # 共享模块
│       ├── app-common.js       # 应用通用配置
│       ├── config/             # 配置文件
│       ├── controllers/        # 共享控制器
│       ├── middlewares/        # 中间件
│       ├── migrations/         # 数据库迁移
│       ├── models/             # 数据模型
│       ├── routes/             # 共享路由
│       ├── services/           # 业务逻辑服务
│       └── utils/              # 工具函数
├── uploads/              # 文件上传目录
├── logs/                 # 日志文件
├── docker-compose.yml    # Docker配置
├── Dockerfile            # Docker构建文件
├── ecosystem.config.js   # PM2配置文件
└── package.json          # 项目依赖
```

## 架构分层

1. **表示层（Routes + Controllers）**
   - 处理HTTP请求和响应
   - 参数验证
   - 权限检查
   - 调用服务层处理业务逻辑

2. **服务层（Services）**
   - 实现核心业务逻辑
   - 调用多个模型完成复杂操作
   - 处理事务和异常

3. **数据层（Models）**
   - 数据库访问和操作
   - 数据校验和转换
   - 提供数据访问接口

4. **工具层（Utils）**
   - 提供通用工具函数
   - 日期处理、加密解密等

## 关键组件

### 认证与授权

- 使用JWT进行用户认证
- 基于角色的访问控制（会员、群主、管理员等）
- 中间件实现权限检查

### 数据存储

- MySQL数据库存储业务数据
- 本地文件系统存储上传文件

### 日志系统

- Winston日志库记录应用运行日志
- 按日期和级别分类存储日志

### 错误处理

- 统一的错误处理中间件
- 格式化的错误响应
- 开发环境和生产环境不同的错误展示策略

### 安全措施

- 使用Helmet增强应用安全性
- 密码加密存储
- 请求速率限制
- 输入验证和参数过滤

## 部署架构

### 开发环境

- 使用nodemon实现代码热重载
- 并发启动多个服务（concurrently）

### 生产环境

- Docker容器化部署
- PM2进程管理
- Nginx反向代理

## 扩展性考虑

1. **模块化设计**：核心功能模块化，便于扩展和维护
2. **共享资源**：通用代码放在shared目录，避免重复
3. **配置外部化**：使用环境变量和配置文件，便于不同环境部署
4. **服务独立**：Admin和H5服务独立运行，可单独扩展 