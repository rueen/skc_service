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

管理后台API基础路径：`/api/admin`

- 认证相关：`/api/admin/users`
- 任务管理：`/api/admin/tasks`
- 会员管理：`/api/admin/members`
- 渠道管理：`/api/admin/channels`
- 群组管理：`/api/admin/groups`
- 文章管理：`/api/admin/articles`

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

# 任务提交模块说明

## 表结构

### 已提交任务表 (submitted_tasks)

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | INT | 自增主键 |
| task_id | INT | 任务ID |
| member_id | INT | 会员ID |
| submit_time | TIMESTAMP | 提交时间 |
| submit_content | JSON | 提交内容 |
| task_audit_status | ENUM | 任务审核状态：待审核(pending)、已通过(approved)、已拒绝(rejected) |
| waiter_id | INT | 审核员ID |
| reject_reason | TEXT | 拒绝原因 |
| create_time | TIMESTAMP | 创建时间 |
| update_time | TIMESTAMP | 更新时间 |

## API 接口

### H5端接口

- `POST /api/h5/task-submit` - 提交任务
- `GET /api/h5/submitted-tasks/:id` - 获取已提交任务详情
- `GET /api/h5/task-submit/check/:taskId` - 检查任务提交状态
- `GET /api/h5/submitted-tasks` - 获取会员已提交任务列表

### admin端接口

- `GET /api/admin/submitted-tasks` - 获取已提交任务列表
- `GET /api/admin/submitted-tasks/:id` - 获取已提交任务详情
- `POST /api/admin/submitted-tasks/batch-approve` - 批量审核通过
- `POST /api/admin/submitted-tasks/batch-reject` - 批量审核拒绝

## 业务逻辑说明

1. **任务提交流程**：
   - 会员必须先报名任务才能提交
   - 只能提交状态为"进行中"的任务
   - 任务提交后状态为"待审核"
   - 已拒绝的任务可以重新提交
   - 已通过或待审核状态的任务不能重复提交

2. **任务审核流程**：
   - 管理员可以批量审核通过或拒绝任务
   - 审核通过后，系统自动创建任务奖励账单
   - 如果设置了群主收益比例，会同时创建群主收益账单

3. **查询功能**：
   - H5端：会员可以查看自己的提交记录
   - admin端：管理员可以根据任务名称、渠道、审核状态、群组等条件筛选提交记录

## 数据迁移

执行以下命令创建数据表：

```bash
node src/shared/migrations/create_submitted_tasks_table.js
``` 