# 项目规则和架构说明

## 项目概述

这是一个基于Node.js的社交营销协作服务平台，分为admin端（管理后台）和H5端（用户前端）两个服务。系统支持会员管理、任务管理、群组管理、账单管理等功能。

## 项目结构

```
scripts/                  # 存放所有迁移脚本
src/
├── admin/                # admin端（管理后台）代码
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

1. **admin端服务 (管理后台)**
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
| finance:withdrawal | 提现管理 | 管理提现申请 |
| finance:bills | 结算账单 | 结算账单 |
| article:list | 文章管理 | 管理系统文章内容 |

## 数据模型规范

系统使用MySQL数据库，主要数据模型包括:

1. **accounts**: 账户表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 账号ID |
| member_id | bigint(20) | NOT NULL | | 会员ID |
| channel_id | bigint(20) | NOT NULL | | 渠道ID |
| account | varchar(100) | NOT NULL | | 账号 |
| home_url | varchar(255) | | NULL | 主页链接 |
| fans_count | int(11) | | 0 | 粉丝数量 |
| friends_count | int(11) | | 0 | 好友数量 |
| posts_count | int(11) | | 0 | 发布数量 |
| account_audit_status | varchar(20) | | 'pending' | 账号审核状态：pending-待审核，approved-已通过，rejected-已拒绝 |
| reject_reason | varchar(255) | | NULL | 拒绝原因 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- KEY `idx_member_id` (`member_id`)
- KEY `idx_channel_id` (`channel_id`)
- KEY `idx_account_audit_status` (`account_audit_status`)

2. **articles**: 文章表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 文章ID |
| title | varchar(200) | NOT NULL | | 文章标题 |
| content | text | NOT NULL | | 文章内容 |
| location | varchar(50) | NOT NULL | 'help' | 文章位置：privacyPolicy-隐私政策，userAgreement-用户协议 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- KEY `idx_location` (`location`)

3. **bills**: 账单表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 账单ID |
| member_id | bigint(20) | NOT NULL | | 会员ID |
| bill_type | varchar(50) | NOT NULL | | 账单类型：withdrawal-提现，task_reward-任务奖励，invite_reward-邀请奖励，group_owner_commission-群主收益 |
| amount | decimal(10,2) | NOT NULL | | 金额 |
| settlement_status | varchar(20) | NOT NULL | 'pending' | 结算状态：success-结算成功，failed-结算失败，pending-等待结算 |
| task_id | bigint(20) | | NULL | 关联的任务ID |
| related_member_id | bigint(20) | | NULL | 关联的会员ID |
| related_group_id | bigint(20) | | NULL | 关联的群组ID |
| failure_reason | varchar(255) | | NULL | 结算失败原因 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- KEY `idx_member_id` (`member_id`)
- KEY `idx_bill_type` (`bill_type`)
- KEY `idx_settlement_status` (`settlement_status`)
- KEY `idx_task_id` (`task_id`)
- KEY `idx_related_member_id` (`related_member_id`)
- KEY `idx_related_group_id` (`related_group_id`)
- KEY `idx_create_time` (`create_time`)

4. **channels**: 渠道表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 渠道ID |
| name | varchar(50) | NOT NULL | | 渠道名称 |
| icon | varchar(255) | | NULL | 渠道图标URL |
| custom_fields | json | | NULL | 自定义字段配置，JSON格式 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- KEY `idx_member_id` (`member_id`)
- KEY `idx_bill_type` (`bill_type`)
- KEY `idx_settlement_status` (`settlement_status`)
- KEY `idx_task_id` (`task_id`)
- KEY `idx_related_member_id` (`related_member_id`)
- KEY `idx_related_group_id` (`related_group_id`)
- KEY `idx_create_time` (`create_time`)

5. **groups**: 群组信息

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 群组ID |
| group_name | varchar(100) | NOT NULL | | 群组名称 |
| group_link | varchar(255) | | NULL | 群组链接 |
| owner_id | bigint(20) | | NULL | 群主ID |
| member_count | int(11) | NOT NULL | 0 | 成员数量 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- KEY `idx_owner_id` (`owner_id`)
- KEY `idx_group_name` (`group_name`)

6. **member_groups**: 会员群组关联表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 关联ID |
| member_id | bigint(20) | NOT NULL | | 会员ID |
| group_id | bigint(20) | NOT NULL | | 群组ID |
| is_owner | tinyint(1) | NOT NULL | 0 | 是否群主：0-否，1-是 |
| join_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 加入时间 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- UNIQUE KEY `uk_member_group` (`member_id`, `group_id`)
- KEY `idx_member_id` (`member_id`)
- KEY `idx_group_id` (`group_id`)
- KEY `idx_is_owner` (`is_owner`)

7. **members**: 会员信息

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 会员ID |
| member_nickname | varchar(50) | NOT NULL | | 会员昵称 |
| member_account | varchar(50) | NOT NULL | | 会员账号 |
| password | varchar(255) | NOT NULL | | 密码（加密存储） |
| inviter_id | bigint(20) | | NULL | 邀请人ID |
| occupation | varchar(20) | | NULL | 职业：housewife-宝妈，freelancer-自由职业，student-学生 |
| invite_code | varchar(10) | NOT NULL | | 邀请码 |
| phone | varchar(20) | | NULL | 手机号 |
| email | varchar(100) | | NULL | 邮箱 |
| avatar | varchar(255) | | NULL | 头像URL |
| gender | tinyint(1) | | 2 | 性别：0-男，1-女，2-保密 |
| balance | decimal(10,2) | NOT NULL | 0.00 | 账户余额 |
| telegram | varchar(50) | | NULL | Telegram账号 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- UNIQUE KEY `uk_member_account` (`member_account`)
- UNIQUE KEY `uk_invite_code` (`invite_code`)
- UNIQUE KEY `uk_phone` (`phone`)
- KEY `idx_inviter_id` (`inviter_id`)
- KEY `idx_create_time` (`create_time`)

8. **system_config**: 系统配置表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 配置ID |
| config_key | varchar(50) | NOT NULL | | 配置键 |
| config_value | text | NOT NULL | | 配置值 |
| description | varchar(255) | | NULL | 配置描述 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- UNIQUE KEY `uk_config_key` (`config_key`)
- KEY `idx_create_time` (`create_time`)

9. **tasks**: 任务表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 任务ID |
| task_name | varchar(100) | NOT NULL | | 任务名称 |
| channel_id | bigint(20) | NOT NULL | | 渠道ID |
| category | varchar(50) | | NULL | 任务类别 |
| task_type | varchar(50) | NOT NULL | | 任务类型 |
| reward | decimal(10,2) | NOT NULL | | 任务奖励金额 |
| brand | varchar(100) | | NULL | 品牌名称 |
| group_ids | json | | NULL | 关联的群组ID列表，JSON格式 |
| group_mode | tinyint(1) | | 0 | 群组模式：0-不指定，1-指定群组 |
| user_range | tinyint(1) | | 0 | 用户范围：0-全部用户，1-完成任务次数 |
| task_count | int(11) | NOT NULL | 1 | 任务数量 |
| custom_fields | json | | NULL | 自定义字段，JSON格式 |
| start_time | datetime | NOT NULL | | 任务开始时间 |
| end_time | datetime | NOT NULL | | 任务结束时间 |
| unlimited_quota | tinyint(1) | NOT NULL | 0 | 是否不限制名额：0-限制，1-不限制 |
| quota | int(11) | | 0 | 任务名额 |
| fans_required | int(11) | | 0 | 要求粉丝数 |
| content_requirement | text | | NULL | 内容要求 |
| task_info | text | NOT NULL | | 任务详情 |
| notice | text | | NULL | 任务须知 |
| task_status | varchar(20) | NOT NULL | 'not_started' | 任务状态：not_started-未开始，processing-进行中，ended-已结束 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- KEY `idx_channel_id` (`channel_id`)
- KEY `idx_task_status` (`task_status`)
- KEY `idx_start_time` (`start_time`)
- KEY `idx_end_time` (`end_time`)
- KEY `idx_task_type` (`task_type`)
- KEY `idx_create_time` (`create_time`)

10. **enrolled_tasks**: 已报名任务表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 报名ID |
| task_id | bigint(20) | NOT NULL | | 任务ID |
| member_id | bigint(20) | NOT NULL | | 会员ID |
| enroll_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 报名时间 |
| related_group_id | bigint(20) | | NULL | 关联的群组ID |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- KEY `idx_channel_id` (`channel_id`)
- KEY `idx_task_status` (`task_status`)
- KEY `idx_start_time` (`start_time`)
- KEY `idx_end_time` (`end_time`)
- KEY `idx_task_type` (`task_type`)
- KEY `idx_create_time` (`create_time`)

11. **submitted_tasks**: 已提交任务表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 提交ID |
| task_id | bigint(20) | NOT NULL | | 任务ID |
| member_id | bigint(20) | NOT NULL | | 会员ID |
| submit_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 提交时间 |
| submit_content | text | NOT NULL | | 提交内容 |
| task_audit_status | varchar(20) | NOT NULL | 'pending' | 审核状态：pending-待审核，approved-已通过，rejected-已拒绝 |
| waiter_id | bigint(20) | | NULL | 审核小二ID |
| reject_reason | varchar(255) | | NULL | 拒绝原因 |
| related_group_id | bigint(20) | | NULL | 关联的群组ID |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- UNIQUE KEY `uk_task_member` (`task_id`, `member_id`)
- KEY `idx_task_id` (`task_id`)
- KEY `idx_member_id` (`member_id`)
- KEY `idx_task_audit_status` (`task_audit_status`)
- KEY `idx_waiter_id` (`waiter_id`)
- KEY `idx_related_group_id` (`related_group_id`)
- KEY `idx_create_time` (`create_time`)

12. **waiters**: 管理后台用户表

| 字段名 | 数据类型 | 约束 | 默认值 | 说明 |
| ------ | ------ | ------ | ------ | ------ |
| id | bigint(20) | NOT NULL AUTO_INCREMENT | | 小二ID |
| username | varchar(50) | NOT NULL | | 用户名 |
| password | varchar(255) | NOT NULL | | 密码（加密存储） |
| is_admin | tinyint(1) | NOT NULL | 0 | 是否管理员：0-否，1-是 |
| remarks | varchar(255) | | NULL | 备注 |
| permissions | varchar(255) | | NULL | 权限列表，逗号分隔 |
| last_login_time | datetime | | NULL | 最后登录时间 |
| create_time | datetime | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL | CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**:
- PRIMARY KEY (`id`)
- UNIQUE KEY `uk_username` (`username`)
- KEY `idx_is_admin` (`is_admin`)
- KEY `idx_create_time` (`create_time`)
   
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
   - 参考 `docs/reward_calculation.md`

## 开发建议

1. **添加新功能**:
   - 先确定是admin端还是H5端功能
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