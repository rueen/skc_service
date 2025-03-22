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
   - API前缀: `/api/support`
   - 主要功能: 管理会员、任务、群组、提现等后台操作

2. **H5端服务 (用户前端)**
   - 入口文件: `src/h5/h5-server.js` 
   - 端口: 3001 (默认)
   - API前缀: `/api/h5`
   - 主要功能: 用户登录注册、任务申请、提现申请等

## 数据模型规范

系统使用MySQL数据库，主要数据模型包括:

1. **members**: 会员信息
2. **groups**: 群组信息  
3. **member_groups**: 会员群组关联表
4. **tasks**: 任务表
5. **task_applications**: 任务申请表
6. **accounts**: 账户表
7. **bills**: 账单表
8. **withdrawals**: 提现表

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
   - 资源名称使用复数形式, 例如: `/api/support/members`, `/api/h5/tasks`

2. **HTTP方法**:
   - GET: 查询资源
   - POST: 创建资源
   - PUT: 更新资源(全量更新)
   - PATCH: 部分更新资源
   - DELETE: 删除资源

3. **响应格式**:
```json
{
  "code": 200,
  "data": {},
  "message": "操作成功"
}
```

4. **错误响应**:
```json
{
  "code": 400,
  "message": "错误信息"
}
```

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

4. **任务申请(TaskApplication)**:
   - 状态: 待审核(pending)、已通过(approved)、已拒绝(rejected)
   - 会员必须先申请任务才能提交

5. **账单(Bill)**:
   - 类型: 提现(withdrawal)、任务收入(task_income)、邀请奖励(invite_reward)、群主奖励(group_reward)

6. **提现(Withdrawal)**:
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

系统中的枚举常量定义在 `src/shared/config/enums.js` 中，包括:

1. **TaskStatus**: 任务状态
   - NOT_STARTED: 'not_started' (未开始)
   - PROCESSING: 'processing' (进行中)
   - ENDED: 'ended' (已结束)

2. **TaskAuditStatus**: 任务审核状态
   - PENDING: 'pending' (待审核)
   - APPROVED: 'approved' (已通过)
   - REJECTED: 'rejected' (已拒绝)

3. **WithdrawalStatus**: 提现状态
   - PENDING: 'pending' (待处理)
   - SUCCESS: 'success' (提现成功)
   - FAILED: 'failed' (提现失败)

4. **BillType**: 账单类型
   - WITHDRAWAL: 'withdrawal' (提现)
   - TASK_INCOME: 'task_income' (任务收入)
   - INVITE_REWARD: 'invite_reward' (邀请奖励)
   - GROUP_REWARD: 'group_reward' (群主奖励)

## 定时任务

系统包含自动化定时任务，主要在 `src/shared/models/scheduled-tasks.js` 中定义:

1. **任务状态自动更新**: 根据开始和结束时间自动更新任务状态
   - 只在admin服务启动时执行，或在H5服务且环境变量ENABLE_SCHEDULED_TASKS=true时执行 