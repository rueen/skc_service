# 项目规则和架构说明

## 项目概述

这是一个基于Node.js的社交营销协作服务平台，分为Support端（管理后台）和H5端（用户前端）两个服务。系统支持会员管理、任务管理、群组管理、账单管理等功能。

## 项目结构

```
src/
├── admin/                # Support端（管理后台）代码
│   ├── admin-server.js   # 管理后台服务入口文件
│   ├── controllers/      # 控制器目录
│   ├── routes/           # 路由目录
│   └── middlewares/      # 中间件目录
├── h5/                   # H5端（用户前端）代码
│   ├── h5-server.js      # H5端服务入口文件
│   ├── controllers/      # 控制器目录
│   ├── routes/           # 路由目录
│   └── middlewares/      # 中间件目录
└── shared/               # 共享代码
    ├── models/           # 数据模型
    ├── config/           # 配置文件
    ├── routes/           # 共享路由
    ├── controllers/      # 共享控制器
    ├── middlewares/      # 共享中间件
    ├── utils/            # 工具函数
    └── app-common.js     # 应用程序通用配置
```

## 服务说明

1. **Support端服务 (管理后台)**
   - 入口文件: `src/admin/admin-server.js`
   - 端口: 3002 (默认)
   - API前缀: `/api/admin`
   - 主要功能: 管理会员、管理任务、审核h5端已提交的任务、管理群组、管理提现等后台操作

2. **H5端服务 (用户前端)**
   - 入口文件: `src/h5/h5-server.js` 
   - 端口: 3001 (默认)
   - API前缀: `/api/h5`
   - 主要功能: 用户登录注册、任务报名、任务提交、提现申请等

### 小二权限说明

系统采用基于账号（小二账号）的权限控制，不同账号拥有不同的权限。管理员账号默认拥有所有权限。
小二账号权限存放在 waiters 表中的 permissions 字段。管理员默认拥有所有权限

| 权限标识 | 说明 | 功能描述 |
|---------|------|----------|
| task:list | 任务管理 | 查看任务列表 |
| task:create | 创建任务 | 新建任务 |
| task:edit | 编辑任务 | 修改任务信息 |
| task:submitted | 已提交任务 | 已提交列表 |
| task:submittedDetail | 已提交任务详情 | 查看已提交任务详情 |
| account:list | 账号审核列表 | 查看账号审核列表 |
| member:list | 会员管理 | 查看会员列表 |
| member:create | 创建会员 | 新建会员 |
| member:edit | 编辑会员 | 修改会员信息 |
| member:view | 查看会员 | 查看会员详情 |
| channel:list | 渠道管理 | 管理渠道信息 |
| group:list | 群组管理 | 管理群组信息 |
| waiter:list | 小二管理 | 管理小二账号 |
| settlement:withdrawal | 提现账单 | 管理提现申请 |
| settlement:otherBills | 其他账单 | 管理其他类型账单 |
| article:list | 文章管理 | 管理系统文章内容 |

## 数据模型规范

系统使用MySQL数据库，主要数据模型包括:

1. **accounts**: 账户表
2. **articles**: 文章表
3. **bills**: 账单表
4. **channels**: 渠道表
5. **groups**: 群组信息
6. **member_groups**: 会员群组关联表
7. **members**: 会员信息
8. **system_config**: 系统配置表
9. **tasks**: 任务表
10. **enrolled_tasks**: 已报名任务表
11. **submitted_tasks**: 已提交任务表
12. **waiters**: 管理后台用户表
13. **withdrawals**: 提现表

## 编码规范

### 命名规范

1. **文件命名**:
   - 使用小写字母，以功能命名，例如: `member.routes.js`, `auth.controller.js`
   - 模型文件使用单数形式，例如: `member.model.js`

2. **变量命名**:
   - 使用驼峰命名法 (camelCase)
   - 布尔变量使用`is`, `has`, `can`等前缀, 例如: `isAdmin`, `hasPermission`

3. **常量命名**:
   - 使用大写字母和下划线, 例如: `MAX_LOGIN_ATTEMPTS`
   - 枚举常量定义在 `src/shared/config/enums.js` 中

4. **数据库表字段**:
   - 使用下划线命名法 (snake_case), 例如: `create_time`, `member_id`
   - 模型中转换为驼峰命名法 (camelCase), 例如: `createTime`, `memberId`

### API规范

1. **URL路径**:
   - RESTful风格
   - 资源名称使用复数形式, 例如: `/api/admin/members`, `/api/h5/tasks`

2. **HTTP方法**:
   - GET: 查询资源
   - POST: 创建资源
   - PUT: 更新资源(全量更新)
   - PATCH: 部分更新资源
   - DELETE: 删除资源

3. **响应格式**:
   - 统一使用响应工具函数 `src/shared/utils/response.util.js`

## 业务规则

1. **会员(Member)**:
   - 一个会员可以属于多个群组
   - 会员可以是群组的群主
   - 会员通过邀请码注册可建立邀请关系

2. **群组(Group)**:
   - 每个群组有一个群主
   - 群组有成员数量限制

3. **任务(Task)**:
   - 任务状态: 未开始(not_started)、进行中(processing)、已结束(ended)
   - 任务可以设置群组限制
   - 任务可以设置配额

4. **任务报名(TaskEnroll)**:
   - 报名后的任务才可以提交

5. **任务提交(TaskSubmit)**：
   - 提交后的任务才可以在后台审核
   - 任务审核状态：待审核(pending)、已通过(approved)、已拒绝(rejected)

6. **奖励计算逻辑**


7. **账单(Bill)**:
   - 类型: 提现(withdrawal)、任务奖励(task_reward)、邀请奖励(invite_reward)、群主收益(group_owner_commission)

8. **提现(Withdrawal)**:
   - 状态: 待处理(pending)、提现成功(success)、提现失败(failed)

## 开发建议

1. **添加新功能**:
   - 先确定是Support端还是H5端功能
   - 按照MVC模式添加相应的路由、控制器、模型
   - 遵循现有代码风格和命名规范

2. **修改现有功能**:
   - 理解现有代码逻辑和数据流
   - 保持向后兼容
   - 适当添加日志记录变更

3. **数据库变更**:
   - 创建迁移脚本
   - 考虑数据一致性
   - 添加回滚机制

## 常用枚举值

系统中的枚举常量定义在 `src/shared/config/enums.js` 中

## 注意事项
   - 时间遵循 'YYYY-MM-DD HH:mm:ss' 格式

## 定时任务

系统包含以下定时任务：

1. **任务状态更新**
   - 功能：自动根据任务的开始和结束时间更新任务状态
   - 任务可能状态：未开始(not_started)、进行中(processing)、已结束(ended)
   - 更新频率：
     - 开发环境：每3分钟更新一次
     - 生产环境：每1分钟更新一次
     - 测试环境：每5分钟更新一次
   - 配置文件：`src/shared/config/scheduler.config.js`
   - 服务实例：默认在管理后台(admin)服务中运行，可通过配置修改为在H5(h5)服务中运行

2. **相关API**
   - 手动触发任务状态更新：POST `/api/task-scheduler/trigger-update`
   - 重新配置定时任务：POST `/api/task-scheduler/reconfigure`
   - 获取当前配置：GET `/api/task-scheduler/config`
   - 设置运行服务实例：POST `/api/task-scheduler/set-service`
   
注意：定时任务API仅限管理员使用，需要管理员权限