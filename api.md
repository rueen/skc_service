# SKC API 文档

## 目录
- [基础信息](#基础信息)
  - [环境说明](#环境说明)
  - [通用响应格式](#通用响应格式)
  - [错误码说明](#错误码说明)
  - [认证方式](#认证方式)
  - [常量/状态枚举说明](#常量状态枚举说明)
  - [小二权限说明](#小二权限说明)
- [数据库表结构](#数据库表结构)
  - [任务表](#任务表tasks)
  - [已提交任务表](#已提交任务表task_submitted)
  - [账号表](#账号表account)
  - [会员表](#会员表member)
  - [渠道表](#渠道表channel)
  - [群组表](#群组表group)
  - [提现表](#提现表withdrawal)
  - [账单表](#账单表bill)
  - [小二表](#小二表waiter)
  - [文章表](#文章表article)
- [API 列表](#api-列表)
  - [用户认证](#用户认证)
  - [任务管理](#任务管理)
  - [已提交管理](#已提交管理)
  - [账号管理](#账号管理)
  - [会员管理](#会员管理)
  - [渠道管理](#渠道管理)
  - [群管理](#群管理)
  - [结算管理](#结算管理)
  - [小二管理](#小二管理)
  - [文章管理](#文章管理)
  - [文章管理](#文章管理)
- [注意事项](#注意事项)
  - [安全要求](#安全要求)
  - [其他要求](#其他要求)
  - [命名规范](#命名规范)

## 基础信息

### 环境说明
- 开发环境：`http://localhost:3001/api/support`
- 生产环境：`https://api.example.com/api/support`

### 通用响应格式
```json
{
  "code": 0,         // 状态码，0 表示成功
  "message": "",     // 提示信息
  "data": {}        // 响应数据
}
```

### 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 0 | 成功 | - |
| 4001 | 参数格式错误 | 检查请求参数的数据类型和格式是否正确 |
| 4002 | 缺少必要参数 | 检查是否遗漏了必需的请求参数 |
| 4003 | 参数值无效 | 检查参数值是否在允许的范围内或符合业务规则 |
| 5001 | 内部服务异常 | 请稍后重试，如果问题持续存在请联系技术支持 |
| 5002 | 数据库连接失败 | 请稍后重试，如果问题持续存在请联系技术支持 |

### 认证方式
所有接口（除登录接口外）都需要在请求头中携带 token：
```
Authorization: Bearer <token>
```

### 常量/状态枚举说明

#### 任务状态 (taskStatus)
| 状态 | 说明 |
|------|------|
| not_started | 未开始 |
| processing | 进行中 |
| ended | 已结束 |

#### 任务类型 (taskType)
| 类型 | 说明 |
|------|------|
| image_text | 图文任务 |
| video | 视频任务 |

#### 任务审核状态 (taskAuditStatus)
| 状态 | 说明 |
|------|------|
| pending | 待审核 |
| approved | 已通过 |
| rejected | 已拒绝 |

#### 账号审核状态 (accountAuditStatus)
| 状态 | 说明 |
|------|------|
| pending | 待审核 |
| approved | 已通过 |
| rejected | 已拒绝 |

#### 提现状态 (withdrawalStatus)
| 状态 | 说明 |
|------|------|
| pending | 待处理 |
| success | 提现成功 |
| failed | 提现失败 |

#### 账单类型 (billType)
| 类型 | 说明 |
|------|------|
| withdrawal | 提现 |
| task_income | 任务收入 |
| invite_reward | 邀请奖励 |
| group_reward | 群主奖励 |

#### 职业类型 (occupationType)
| 类型 | 说明 |
|------|------|
| housewife | 宝妈 |
| freelancer | 自由职业 |
| student | 学生 |

#### 结算状态 (settlementStatus)
| 状态 | 说明 |
|------|------|
| settled | 已结算 |
| failed | 结算失败 |

### 小二权限说明

系统采用基于角色（小二账号）的权限控制，不同角色拥有不同的权限。管理员账号默认拥有所有权限。

| 权限标识 | 说明 | 功能描述 |
|---------|------|----------|
| task:list | 任务管理 | 查看任务列表 |
| task:create | 创建任务 | 新建任务 |
| task:edit | 编辑任务 | 修改任务信息 |
| task:audit | 任务审核 | 审核已提交的任务 |
| task:auditDetail | 任务审核详情 | 查看任务审核详情 |
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

## 数据库表结构

### 任务表（tasks）

```sql
CREATE TABLE `tasks` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `task_name` varchar(100) NOT NULL COMMENT '任务名称',
  `channel_id` bigint(20) NOT NULL COMMENT '渠道ID',
  `category` varchar(50) NOT NULL COMMENT '任务类别',
  `task_type` varchar(20) NOT NULL COMMENT '任务类型：image_text-图文任务，video-视频任务',
  `reward` decimal(10,2) NOT NULL COMMENT '任务奖励金额',
  `brand` varchar(100) NOT NULL COMMENT '品牌名称',
  `group_ids` json DEFAULT NULL COMMENT '群组ID列表',
  `group_mode` tinyint(1) NOT NULL DEFAULT '0' COMMENT '群组模式',
  `user_range` tinyint(1) NOT NULL DEFAULT '1' COMMENT '用户范围',
  `task_count` int(11) NOT NULL DEFAULT '0' COMMENT '任务数量',
  `custom_fields` json NOT NULL COMMENT '自定义字段',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `unlimited_quota` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否不限名额',
  `fans_required` varchar(50) DEFAULT NULL COMMENT '粉丝要求',
  `content_requirement` text COMMENT '内容要求',
  `task_info` text COMMENT '任务说明',
  `notice` text COMMENT '温馨提示',
  `task_status` varchar(20) NOT NULL DEFAULT 'not_started' COMMENT '任务状态：not_started-未开始，processing-进行中，ended-已结束',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_channel_id` (`channel_id`),
  KEY `idx_task_status` (`task_status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';
```

### 已提交任务表（task_submitted）

```sql
CREATE TABLE `task_submitted` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '提交ID',
  `task_id` bigint(20) NOT NULL COMMENT '关联任务ID',
  `member_id` bigint(20) NOT NULL COMMENT '关联会员ID',
  `task_audit_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending-待审核，approved-已通过，rejected-已拒绝',
  `apply_time` datetime DEFAULT NULL COMMENT '报名时间',
  `submit_time` datetime DEFAULT NULL COMMENT '提交时间',
  `reject_reason` varchar(255) DEFAULT NULL COMMENT '拒绝原因',
  `submit_content` json DEFAULT NULL COMMENT '提交内容',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_task_audit_status` (`task_audit_status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已提交任务表';
```

### 账号表（account）

```sql
CREATE TABLE `accounts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账号ID',
  `member_id` bigint(20) NOT NULL COMMENT '会员ID',
  `channel_id` bigint(20) NOT NULL COMMENT '渠道ID',
  `account` varchar(100) NOT NULL COMMENT '账号名称',
  `home_url` varchar(255) DEFAULT NULL COMMENT '主页链接',
  `fans_count` int(11) DEFAULT '0' COMMENT '粉丝数量',
  `friends_count` int(11) DEFAULT '0' COMMENT '好友数量',
  `posts_count` int(11) DEFAULT '0' COMMENT '发布数量',
  `account_audit_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending-待审核，approved-已通过，rejected-已拒绝',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_channel_id` (`channel_id`),
  KEY `idx_account_audit_status` (`account_audit_status`),
  UNIQUE KEY `uk_member_channel_account` (`member_id`,`channel_id`,`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账号表';
```

### 会员表（member）

```sql
CREATE TABLE `members` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '会员ID',
  `member_nickname` varchar(50) NOT NULL COMMENT '会员昵称',
  `member_account` varchar(50) NOT NULL COMMENT '会员账号',
  `group_id` bigint(20) DEFAULT NULL COMMENT '所属群组ID',
  `inviter_id` bigint(20) DEFAULT NULL COMMENT '邀请人ID',
  `occupation` varchar(20) DEFAULT NULL COMMENT '职业：housewife-宝妈，freelancer-自由职业，student-学生',
  `is_group_owner` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否是群主：0-否，1-是',
  `invite_code` varchar(20) DEFAULT NULL COMMENT '邀请码',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_inviter_id` (`inviter_id`),
  UNIQUE KEY `uk_member_account` (`member_account`),
  UNIQUE KEY `uk_invite_code` (`invite_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员表';
```

### 渠道表（channel）

```sql
CREATE TABLE `channels` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '渠道ID',
  `name` varchar(50) NOT NULL COMMENT '渠道名称',
  `icon` varchar(255) DEFAULT NULL COMMENT '渠道图标',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='渠道表';
```

### 群组表（group）

```sql
CREATE TABLE `groups` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '群组ID',
  `group_name` varchar(100) NOT NULL COMMENT '群组名称',
  `group_link` varchar(255) DEFAULT NULL COMMENT '群组链接',
  `owner_id` bigint(20) DEFAULT NULL COMMENT '群主ID',
  `member_count` int(11) NOT NULL DEFAULT '0' COMMENT '成员数量',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_owner_id` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组表';
```

### 提现表（withdrawal）

```sql
CREATE TABLE `withdrawals` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '提现ID',
  `member_id` bigint(20) NOT NULL COMMENT '会员ID',
  `withdrawal_account` varchar(100) NOT NULL COMMENT '提现账号',
  `withdrawal_account_type` varchar(20) NOT NULL COMMENT '提现账号类型：bank-银行卡，alipay-支付宝，wechat-微信',
  `amount` decimal(10,2) NOT NULL COMMENT '提现金额',
  `real_name` varchar(50) NOT NULL COMMENT '真实姓名',
  `withdrawal_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '提现状态：pending-待处理，success-提现成功，failed-提现失败',
  `apply_time` datetime NOT NULL COMMENT '申请时间',
  `process_time` datetime DEFAULT NULL COMMENT '处理时间',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_withdrawal_status` (`withdrawal_status`),
  KEY `idx_apply_time` (`apply_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现表';
```

### 账单表（bill）

```sql
CREATE TABLE `bills` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账单ID',
  `member_id` bigint(20) NOT NULL COMMENT '会员ID',
  `bill_type` varchar(20) NOT NULL COMMENT '账单类型：withdrawal-提现，task_income-任务收入，invite_reward-邀请奖励，group_reward-群主奖励',
  `amount` decimal(10,2) NOT NULL COMMENT '金额',
  `related_id` bigint(20) DEFAULT NULL COMMENT '关联ID',
  `settlement_status` varchar(20) NOT NULL DEFAULT 'settled' COMMENT '结算状态：settled-已结算，failed-结算失败',
  `remark` varchar(255) DEFAULT NULL COMMENT '备注',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_bill_type` (`bill_type`),
  KEY `idx_settlement_status` (`settlement_status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账单表';
```

### 小二表（waiter）

```sql
CREATE TABLE `waiters` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '小二ID',
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码（bcrypt加密）',
  `is_admin` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否管理员：0-否，1-是',
  `remarks` varchar(255) DEFAULT NULL COMMENT '备注',
  `permissions` text DEFAULT NULL COMMENT '权限列表，逗号分隔',
  `last_login_time` datetime DEFAULT NULL COMMENT '最后登录时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小二表';
```

### 文章表（article）

```sql
CREATE TABLE `articles` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '文章ID',
  `title` varchar(100) NOT NULL COMMENT '文章标题',
  `content` text NOT NULL COMMENT '文章内容',
  `location` varchar(50) NOT NULL COMMENT '文章位置标识',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_location` (`location`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';
```

## API 列表

### 用户认证

#### 用户登录
- **接口**：`POST /users/login`
- **描述**：用户登录接口，服务端使用 bcrypt 验证密码
- **请求参数**：
  ```json
  {
    "username": "admin",     // 用户名
    "password": "admin123"   // 原始密码（应通过 HTTPS 传输确保安全）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "登录成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "username": "admin",
      "permissions": [
        "task:list",
        "task:create",
        "task:edit",
        "task:audit"
      ]
    }
  }
  ```
- **密码验证流程**：
  1. 客户端通过 HTTPS 将原始密码发送到服务器
  2. 服务器使用 bcrypt 的 `compare` 方法验证密码
  3. 验证成功后返回 token 和用户信息

### 任务管理

#### 获取任务列表
- **接口**：`GET /tasks`
- **描述**：获取任务列表，支持分页和筛选
- **请求参数**：
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "taskName": "",      // 任务名称（可选）
    "taskStatus": "",    // 任务状态（可选）
    "channelId": null    // 渠道ID（可选）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "taskName": "测试任务1",
          "channelId": 1,
          "channelName": "facebook",
          "taskStatus": "not_started",
          "createTime": "2024-03-01 10:00:00"
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 创建任务
- **接口**：`POST /tasks`
- **描述**：创建新任务
- **请求参数**：
  ```json
  {
    "taskName": "任务名称",
    "channelId": 1,
    "category": "宝妈",
    "taskType": "image_text",
    "reward": 100,
    "brand": "品牌名称",
    "groupIds": [],
    "groupMode": 0,
    "userRange": 1,
    "customFields": [
      {
        "title": "帖子链接",
        "type": "input"
      },
      {
        "title": "数据截图",
        "type": "image"
      }
    ],
    "startTime": "2025-03-10 09:10:10",
    "endTime": "2025-03-13 09:10:10",
    "unlimitedQuota": true,
    "fansRequired": "10w+",
    "contentRequirement": "要求说明",
    "taskInfo": "任务说明",
    "notice": "温馨提示"
  }
  ```

#### 编辑任务
- **接口**：`PUT /tasks/:id`
- **描述**：编辑已有任务
- **请求参数**：与创建任务相同，需要额外传入 `id` 字段

#### 删除任务
- **接口**：`DELETE /tasks/:id`
- **描述**：删除任务
- **请求参数**：
  ```json
  {
    "id": 1  // 任务ID
  }
  ```

#### 获取任务详情
- **接口**：`GET /tasks/detail`
- **描述**：获取任务详细信息
- **请求参数**：
  ```json
  {
    "id": 1  // 任务ID
  }
  ```

#### 导出任务
- **接口**：`GET /tasks/export`
- **描述**：导出任务数据
- **请求参数**：支持与任务列表相同的筛选条件

### 已提交管理

#### 获取已提交列表
- **接口**：`GET /taskSubmitted`
- **描述**：获取已提交列表
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "taskName": "",      // 任务名称（可选）
    "taskAuditStatus": "",   // 任务审核状态 （可选）
    "channelId": null,   // 渠道ID（可选）
    "groupId": null      // 所属群组
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "taskName": "测试任务1",
          "channelId": 1,
          "channelName": "",
          "memberNickname": "测试会员1",
          "groupName": "群组1",
          "isGroupOwner": true,
          "reward": 100,
          "taskAuditStatus": "pending"
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 获取已提交详情
- **接口**：`GET /taskSubmitted/detail`
- **描述**：获取已提交详情
- **请求参数**：
  ```json
  {
    "id": 1   // 已提交ID
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "relatedTaskId": 1,                  // 关联任务ID
      "relatedMemberId": 1,                // 关联会员ID
      "taskAuditStatus": "pending",            // 审核状态
      "applyTime": "2025-03-10 09:10:10",  // 报名时间
      "submitTime": "2025-03-10 09:10:10", // 提交时间
      "rejectReason": "",                  // 拒绝原因
    }
  }
  ```

#### 批量通过
- **接口**：`POST /taskSubmitted/batchResolve`
- **描述**：批量通过已提交的任务

#### 批量拒绝
- **接口**：`POST /taskSubmitted/batchReject`
- **描述**：批量拒绝已提交的任务

### 账号管理

#### 获取账号列表
- **接口**：`GET /accounts`
- **描述**：获取账号列表
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "account": "",       // 账号（可选）
    "channelId": 1,      // 渠道ID（可选）
    "accountAuditStatus": "",   // 账号审核状态
    "groupId": 1         // 所属群ID
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "account": "test123",
          "channelId": 1,
          "channelName": "抖音",
          "homeUrl": "https://example.com/test123",
          "fansCount": 1000,
          "friendsCount": 100,
          "postsCount": 50,
          "memberNickname": "测试会员1",
          "groupName": "群组1",
          "isGroupOwner": true,
          "accountAuditStatus": "pending",
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 批量通过
- **接口**：`POST /account/batchResolve`
- **描述**：批量审核通过账号

#### 批量拒绝
- **接口**：`POST /account/batchReject`
- **描述**：批量审核拒绝账号

### 会员管理

#### 获取会员列表
- **接口**：`GET /members`
- **描述**：获取会员列表
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "memberNickname": "",      // 会员名称（可选）
    "groupId": "",    // 所属群组（可选）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "memberNickname": "张三", // 会员昵称
          "memberAccount": "test123", // 会员账号
          "groupId": 1,
          "groupName": "群组1",
          "isGroupOwner": true,
          "accountList": [
            {
              "account": "test123",
              "homeUrl": "https://example.com/test123",
            },
            {
              "account": "test123",
              "homeUrl": "https://example.com/test123",
            },
          ],
          "updateTime": "2024-03-01 10:00:00"
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 添加会员
- **接口**：`POST /members`
- **描述**：添加新会员
- **请求参数**：
  ```json
  {
    "memberNickname": "",           // 会员名称
    "memberAccount": "",      // 会员账号
    "groupId": 1,    // 所属群组ID
    "inviterId": 1,  // 邀请人ID
    "occupation": "student",  // 职业
    "isGroupOwner": false, // 是否是群主
  }
  ```

#### 编辑会员
- **接口**：`PUT /members/:id`
- **描述**：编辑会员信息
- **请求参数**：与添加会员相同，需要额外传入 `id` 字段

#### 删除会员
- **接口**：`DELETE /members/:id`
- **描述**：删除会员

#### 获取会员详情
- **接口**：`GET /members/detail`
- **描述**：获取会员详情
- **请求参数**：
  ```json
  {
    "id": 1    // 会员ID
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "id": 1,
      "memberNickname": "",           // 会员名称
      "memberAccount": "",      // 会员账号
      "groupId": 1,    // 所属群组ID
      "groupName": "群组1",
      "inviterId": 1,  // 邀请人ID
      "inviterName": "李四",
      "occupation": "student",  // 职业
      "isGroupOwner": false, // 是否是群主
      "inviteCode": "ABC123",
      "inviteUrl": "https://example.com/invite/ABC123",
    }
  }
  ```

### 渠道管理

#### 获取渠道列表
- **接口**：`GET /channels`
- **描述**：获取渠道列表
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "keyword": "",      // 搜索关键字（可选）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "name": "facebook", 
          "icon": "http://abc",
          "updateTime": "2024-03-01 10:00:00"
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 添加渠道
- **接口**：`POST /channels`
- **描述**：添加新渠道
- **请求参数**：
  ```json
  {
    "name": "facebook", 
    "icon": "http://abc",
  }
  ```
#### 编辑渠道
- **接口**：`PUT /channels/:id`
- **描述**：编辑渠道信息
- **请求参数**：与添加新渠道相同，需要额外传入 `id` 字段

#### 删除渠道
- **接口**：`DELETE /channels/:id`
- **描述**：删除渠道

### 群管理

#### 群列表
- **接口**：`GET /group`
- **描述**：获取群列表
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "groupName": "",      // 群名称（可选）
    "ownerId": "",    // 群主ID（可选）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "groupName": "测试群1",
          "groupLink": "https://example.com/group/group001",
          "ownerId": 1,
          "ownerName": "张三",
          "memberCount": 100,
          "updateTime": "2024-03-01 10:00:00"
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 添加群
- **接口**：`POST /group`
- **描述**：添加新渠道
- **请求参数**：
  ```json
  {
    "groupName": "",     // 群名称
    "groupLink": "http://abc",   // 群链接
    "ownerId": 1    // 群主ID
  }
  ```

#### 编辑群
- **接口**：`PUT /group/:id`
- **描述**：编辑群信息
- **请求参数**：与添加群相同，需要额外传入 `id` 字段

#### 删除群
- **接口**：`DELETE /group/:id`
- **描述**：删除群

### 结算管理

#### 提现管理
- **接口**：`GET /settlement/withdrawal`
- **描述**：获取提现记录列表
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "memberNickname": "",      // 会员名称（可选）
    "withdrawalStatus": "",    // 提现状态（可选）
    "startTime": null,    // 开始时间（可选）
    "endTime": null       // 结束时间
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "memberNickname": "张三",
          "memberAccount": "13800138000",
          "withdrawalAccount": "6222021234567890123",
          "withdrawalAccountType": "bank",
          "amount": 1000.00,
          "realName": "张三",
          "withdrawalStatus": "pending",
          "applyTime": "2024-02-28 10:00:00",
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 批量通过提现
- **接口**：`POST /settlement/withdrawal/batchResolve`
- **描述**：批量通过提现申请

#### 批量拒绝提现
- **接口**：`POST /settlement/withdrawal/batchReject`
- **描述**：批量拒绝提现申请

#### 导出提现记录
- **接口**：`GET /settlement/withdrawal/export`
- **描述**：导出提现记录
- **请求参数**：支持与提现列表相同的筛选条件

#### 其他账单
- **接口**：`GET /settlement/otherBills`
- **描述**：获取其他账单记录
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "memberNickname": "",      // 会员名称（可选）
    "billType": "",    // 账单类型（可选）
    "settlementStatus": "",    // 结算状态（可选）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "memberNickname": "张三",
          "memberAccount": "13800138000",
          "billType": "task_income",
          "amount": 100.00,
          "settlementStatus": "settled",
          "createTime": "2024-03-01 10:00:00"
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

### 小二管理

#### 获取小二列表
- **接口**：`GET /waiters`
- **描述**：获取小二列表
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "keyword": "",      // 搜索关键字（可选）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "username": "admin",
          "is_admin": true,
          "remarks": "管理员",
          "permissions": "",  // 权限
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 添加小二
- **接口**：`POST /waiters`
- **描述**：添加新小二
- **请求参数**：
  ```json
  {
    "username": "",     // 用户名
    "password": "",   // 密码
    "remarks": "",    // 备注
    "permissions": ""   // 权限
  }
  ```

#### 编辑小二
- **接口**：`PUT /waiters/:id`
- **描述**：编辑小二信息
- **请求参数**：与添加小二相同，需要额外传入 `id` 字段

#### 删除小二
- **接口**：`DELETE /waiters/:id`
- **描述**：删除小二

### 文章管理

#### 获取文章列表
- **接口**：`GET /articles`
- **描述**：获取文章内容
- **请求参数**：支持分页和筛选
  ```json
  {
    "page": 1,           // 页码
    "pageSize": 10,      // 每页条数
    "keyword": "",      // 搜索关键字（可选）
  }
  ```
- **响应示例**：
  ```json
  {
    "code": 0,
    "message": "",
    "data": {
      "total": 100,
      "list": [
        {
          "id": 1,
          "title": "用户协议",
          "content": "这是用户协议的内容...",
          "location": "userAgreement",
          "updateTime": "2024-02-28 10:00:00"
        }
      ],
      "page": 1,
      "pageSize": 10
    }
  }
  ```

#### 添加文章
- **接口**：`POST /articles`
- **描述**：添加新渠道
- **请求参数**：
  ```json
  {
    "title": "用户协议",
    "content": "这是用户协议的内容...",
    "location": "userAgreement",      // 需要确保唯一性
    "updateTime": "2024-02-28 10:00:00"
  }
  ```
#### 编辑文章
- **接口**：`PUT /articles/:id`
- **描述**：编辑文章信息
- **请求参数**：与添加文章相同，需要额外传入 `id` 或 `location` 字段

#### 删除文章
- **接口**：`DELETE /articles/:id`
- **描述**：删除文章
- **请求参数**：`id` 或 `location`

### 注意事项

#### 安全要求
- API路由保护
- CORS 配置
- 防止 SQL 注入攻击
- 对接口限流，添加接口访问频率限制，防止恶意请求和服务器过载

#### 其他要求
- 为所有接口添加统一的错误处理机制
- 遵循 RESTful API 设计原则
- 为这个项目中的所有代码写上详细注释
- 充分考虑安全因素

#### 命名规范
- 数据库表字段：使用下划线命名法（snake_case）
  - 例如：create_time、update_time、last_login_time
- API 响应字段：使用驼峰命名法（camelCase）
  - 例如：createTime、updateTime、lastLoginTime
