# SKC 服务平台 - 数据库表结构说明

SKC 服务平台使用 MySQL 数据库，下面是主要数据表的结构说明。

## 核心表结构

### 会员表 (members)

存储平台用户信息。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，会员ID |
| nickname | varchar(50) | 会员昵称 |
| account | varchar(50) | 会员账号，唯一 |
| password | varchar(255) | 密码（加密存储） |
| inviter_id | bigint(20) | 邀请人ID |
| occupation | varchar(20) | 职业：housewife-宝妈，freelancer-自由职业，student-学生 |
| invite_code | varchar(10) | 邀请码，唯一 |
| phone | varchar(20) | 手机号 |
| email | varchar(100) | 邮箱 |
| avatar | varchar(255) | 头像URL |
| gender | tinyint(1) | 性别：0-男，1-女，2-保密 |
| balance | decimal(10,2) | 账户余额 |
| telegram | varchar(50) | Telegram账号 |
| register_source | varchar(20) | 注册来源：admin-管理端添加，h5-H5端注册 |
| is_new | tinyint(1) | 是否新人：0-否，1-是 |
| password_changed_time | datetime | 密码最后修改时间 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 账号表 (accounts)

存储用户的社交媒体账号信息。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，账号ID |
| member_id | bigint(20) | 会员ID |
| channel_id | bigint(20) | 渠道ID |
| account | varchar(100) | 账号 |
| home_url | varchar(255) | 主页链接 |
| fans_count | int(11) | 粉丝数量 |
| friends_count | int(11) | 好友数量 |
| posts_count | int(11) | 发布数量 |
| account_audit_status | varchar(20) | 账号审核状态：pending-待审核，approved-已通过，rejected-已拒绝 |
| reject_reason | varchar(255) | 拒绝原因 |
| waiter_id | bigint(20) | 审核小二ID |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 渠道表 (channels)

存储平台支持的社交媒体渠道。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，渠道ID |
| name | varchar(50) | 渠道名称，唯一 |
| icon | varchar(255) | 渠道图标URL |
| custom_fields | json | 自定义字段配置，JSON格式 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 任务表 (tasks)

存储平台发布的任务信息。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，任务ID |
| task_name | varchar(100) | 任务名称 |
| channel_id | bigint(20) | 渠道ID |
| category | varchar(50) | 任务类别 |
| task_type | varchar(50) | 任务类型 |
| description | text | 任务描述 |
| requirements | text | 任务要求 |
| reward_amount | decimal(10,2) | 奖励金额 |
| max_participants | int(11) | 最大参与人数 |
| current_participants | int(11) | 当前参与人数 |
| deadline | datetime | 截止时间 |
| status | varchar(20) | 任务状态：draft-草稿，published-已发布，completed-已完成，cancelled-已取消 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 任务参与表 (enrolled_tasks)

存储用户参与任务的记录。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，参与记录ID |
| member_id | bigint(20) | 会员ID |
| task_id | bigint(20) | 任务ID |
| account_id | bigint(20) | 账号ID |
| status | varchar(20) | 参与状态：enrolled-已参与，completed-已完成，abandoned-已放弃 |
| enroll_time | datetime | 参与时间 |
| complete_time | datetime | 完成时间 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 任务提交表 (submitted_tasks)

存储用户提交的任务完成证明。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，提交记录ID |
| enrolled_task_id | bigint(20) | 参与任务ID |
| member_id | bigint(20) | 会员ID |
| task_id | bigint(20) | 任务ID |
| submission_content | text | 提交内容 |
| submission_images | text | 提交图片，多个URL以逗号分隔 |
| audit_status | varchar(20) | 审核状态：pending-待审核，approved-已通过，rejected-已拒绝 |
| reject_reason | varchar(255) | 拒绝原因 |
| waiter_id | bigint(20) | 审核小二ID |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 群组表 (groups)

存储平台群组信息。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，群组ID |
| group_name | varchar(100) | 群组名称 |
| group_link | varchar(255) | 群组链接 |
| owner_id | bigint(20) | 群主ID |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 会员群组关联表 (member_groups)

存储会员与群组的关联关系。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，关联ID |
| member_id | bigint(20) | 会员ID |
| group_id | bigint(20) | 群组ID |
| is_owner | tinyint(1) | 是否群主：0-否，1-是 |
| join_time | datetime | 加入时间 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 账单表 (bills)

存储平台所有资金流动记录。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，账单ID |
| member_id | bigint(20) | 会员ID |
| bill_type | varchar(50) | 账单类型：withdrawal-提现，task_reward-任务奖励，invite_reward-邀请奖励，group_owner_commission-群主收益 |
| amount | decimal(10,2) | 金额 |
| settlement_status | varchar(20) | 结算状态：success-结算成功，failed-结算失败，pending-等待结算 |
| withdrawal_status | varchar(20) | 提现状态：pending-待处理，success-已完成，failed-已拒绝 |
| task_id | bigint(20) | 关联的任务ID |
| related_member_id | bigint(20) | 关联的会员ID |
| related_group_id | bigint(20) | 关联的群组ID |
| failure_reason | varchar(255) | 结算失败原因 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 提现账户表 (withdrawal_accounts)

存储用户的提现账户信息。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，提现账户ID |
| member_id | bigint(20) | 会员ID |
| account_type | varchar(20) | 账户类型：alipay-支付宝，wechat-微信 |
| account_name | varchar(50) | 账户姓名 |
| account_number | varchar(100) | 账号 |
| is_default | tinyint(1) | 是否默认账户：0-否，1-是 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 提现记录表 (withdrawals)

存储用户的提现申请记录。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，提现记录ID |
| member_id | bigint(20) | 会员ID |
| withdrawal_account_id | bigint(20) | 提现账户ID |
| amount | decimal(10,2) | 提现金额 |
| status | varchar(20) | 提现状态：pending-待处理，success-已完成，failed-已拒绝 |
| reject_reason | varchar(255) | 拒绝原因 |
| operator_id | bigint(20) | 操作员ID |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 系统配置表 (system_config)

存储系统配置项。

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 主键，配置ID |
| config_key | varchar(50) | 配置键，唯一 |
| config_value | text | 配置值 |
| description | varchar(255) | 配置描述 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

## 表关系图

```
members ──────┐
   │          │
   │          ▼
   │      withdrawal_accounts
   │          │
   │          ▼
   │      withdrawals
   │
   ├──────► accounts ◄─────┐
   │          │            │
   │          │            │
   │          ▼            │
   │      enrolled_tasks   │
   │          │            │
   │          ▼            │
   │      submitted_tasks  │
   │                       │
   ├──────► member_groups  │
   │          │            │
   │          ▼            │
   │        groups         │
   │                       │
   ├──────► bills          │
   │                       │
   └──────► invites        │
                           │
channels ──────────────────┘
   │
   ▼
  tasks
```

## 索引设计

每个表都包含适当的索引以优化查询性能，主要包括：

1. 主键索引
2. 外键关联字段索引
3. 常用查询条件字段索引
4. 唯一约束索引

## 字段命名规范

- 表名：全部小写，复数形式
- 字段名：小写下划线命名法 (snake_case)
- 主键：统一为 id
- 外键：关联表名_id 形式
- 时间字段：create_time, update_time 等
- 状态字段：通常使用 status 后缀

## 数据类型选择原则

- 整数类型：根据数据范围选择合适的类型，主键通常使用 bigint
- 字符串：根据长度选择 varchar 或 text
- 金额：使用 decimal 类型以保证精确计算
- 时间：使用 datetime 类型
- 布尔值：使用 tinyint(1)，0 表示 false，1 表示 true
- JSON数据：使用 json 类型 