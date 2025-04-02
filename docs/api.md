# SKC 服务平台 - API 文档

## 概述

SKC 服务平台API分为两个独立的服务：

1. **管理端API（Admin）**：提供给管理员使用的后台管理功能
2. **用户端API（H5）**：提供给普通用户使用的移动端功能

所有API采用RESTful风格设计，返回JSON格式数据。

## 通用规范

### 基础URL

- 管理端API: `/api/admin`
- 用户端API: `/api/h5`

### 请求头

```
Content-Type: application/json
Authorization: Bearer <token>  // 身份认证令牌
```

### 响应格式

成功响应：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    // 响应数据
  }
}
```

错误响应：

```json
{
  "code": 400,  // HTTP状态码
  "message": "错误信息",
  "errors": [
    // 具体错误细节（可选）
  ]
}
```

### 分页参数

对于支持分页的接口，通用参数如下：

- `page`: 页码，默认1
- `pageSize`: 每页条数，默认10
- `sortField`: 排序字段
- `sortOrder`: 排序方式，asc（升序）或desc（降序）

分页响应格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "list": [],      // 数据列表
    "total": 100,    // 总条数
    "page": 1,       // 当前页码
    "pageSize": 10,  // 每页条数
    "totalPages": 10 // 总页数
  }
}
```

## 权限认证

### 登录接口

#### 管理员登录

```
POST /api/admin/auth/login
```

请求参数：

```json
{
  "username": "admin",
  "password": "password"
}
```

响应数据：

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "userInfo": {
      "id": 1,
      "username": "admin",
      "nickname": "管理员",
      "role": "admin"
    }
  }
}
```

#### 会员登录

```
POST /api/h5/auth/login
```

请求参数：

```json
{
  "account": "user123",
  "password": "password"
}
```

响应数据：

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 86400,
    "memberInfo": {
      "id": 1,
      "account": "user123",
      "nickname": "用户昵称",
      "avatar": "头像URL",
      "balance": 100.00
    }
  }
}
```

### 注册接口

```
POST /api/h5/auth/register
```

请求参数：

```json
{
  "account": "user123",
  "password": "password",
  "nickname": "用户昵称",
  "inviteCode": "AB12CD",  // 可选，邀请码
  "phone": "13800138000",  // 可选
  "email": "user@example.com",  // 可选
  "occupation": "student"  // 可选，职业类型
}
```

响应数据：

```json
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "memberId": 10001,
    "inviteCode": "XYZ123",  // 系统为该用户生成的邀请码
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 管理端API

### 会员管理

#### 获取会员列表

```
GET /api/admin/members
```

参数：

- `page`: 页码
- `pageSize`: 每页条数
- `keyword`: 搜索关键词，可搜索账号、昵称、手机号
- `registerSource`: 注册来源，可选值：h5, admin
- `startTime`: 起始时间，格式：YYYY-MM-DD
- `endTime`: 结束时间，格式：YYYY-MM-DD

#### 获取会员详情

```
GET /api/admin/members/{id}
```

#### 添加会员

```
POST /api/admin/members
```

#### 更新会员信息

```
PUT /api/admin/members/{id}
```

#### 删除会员

```
DELETE /api/admin/members/{id}
```

### 任务管理

#### 获取任务列表

```
GET /api/admin/tasks
```

#### 获取任务详情

```
GET /api/admin/tasks/{id}
```

#### 创建任务

```
POST /api/admin/tasks
```

#### 更新任务

```
PUT /api/admin/tasks/{id}
```

#### 删除任务

```
DELETE /api/admin/tasks/{id}
```

#### 任务审核

```
POST /api/admin/submitted-tasks/{id}/audit
```

请求参数：

```json
{
  "auditStatus": "approved",  // approved 或 rejected
  "rejectReason": "拒绝原因"  // 当 auditStatus 为 rejected 时必填
}
```

### 账号管理

#### 获取账号列表

```
GET /api/admin/accounts
```

#### 审核账号

```
POST /api/admin/accounts/{id}/audit
```

请求参数：

```json
{
  "auditStatus": "approved",  // approved 或 rejected
  "rejectReason": "拒绝原因"  // 当 auditStatus 为 rejected 时必填
}
```

### 群组管理

#### 获取群组列表

```
GET /api/admin/groups
```

#### 创建群组

```
POST /api/admin/groups
```

请求参数：

```json
{
  "groupName": "群组名称",
  "groupLink": "群组链接",
  "ownerId": 10001  // 群主ID，可选
}
```

#### 更新群组

```
PUT /api/admin/groups/{id}
```

#### 删除群组

```
DELETE /api/admin/groups/{id}
```

#### 获取群组成员

```
GET /api/admin/groups/{id}/members
```

### 提现管理

#### 获取提现申请列表

```
GET /api/admin/withdrawals
```

#### 审核提现申请

```
POST /api/admin/withdrawals/{id}/audit
```

请求参数：

```json
{
  "status": "success",  // success 或 failed
  "rejectReason": "拒绝原因"  // 当 status 为 failed 时必填
}
```

### 系统配置

#### 获取系统配置

```
GET /api/admin/system-configs
```

#### 更新系统配置

```
PUT /api/admin/system-configs
```

请求参数：

```json
[
  {
    "configKey": "max_group_members",
    "configValue": "200"
  },
  {
    "configKey": "invite_reward_amount",
    "configValue": "5.00"
  }
]
```

## 用户端API

### 会员信息

#### 获取当前会员信息

```
GET /api/h5/member/profile
```

#### 更新会员信息

```
PUT /api/h5/member/profile
```

### 系统配置

#### 获取系统配置

```
GET /api/h5/system-configs
```

响应数据：

```json
{
  "code": 200,
  "message": "获取所有系统配置成功",
  "data": [
    {
      "id": 1,
      "config_key": "max_group_members",
      "config_value": "200",
      "description": "群组最大成员数",
      "create_time": "2023-01-01T00:00:00.000Z",
      "update_time": "2023-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "config_key": "invite_reward_amount",
      "config_value": "5.00",
      "description": "邀请奖励金额（元）",
      "create_time": "2023-01-01T00:00:00.000Z",
      "update_time": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### 任务相关

#### 获取任务列表

```
GET /api/h5/tasks
```

参数：

- `page`: 页码
- `pageSize`: 每页条数
- `channelId`: 渠道ID
- `status`: 任务状态，可选值：published, completed, cancelled

#### 获取任务详情

```
GET /api/h5/tasks/{id}
```

#### 参与任务

```
POST /api/h5/tasks/{id}/enroll
```

请求参数：

```json
{
  "accountId": 123  // 用户参与任务的账号ID
}
```

#### 提交任务

```
POST /api/h5/tasks/{id}/submit
```

请求参数：

```json
{
  "submissionContent": "任务提交内容",
  "submissionImages": ["图片URL1", "图片URL2"]
}
```

#### 获取我参与的任务

```
GET /api/h5/member/enrolled-tasks
```

参数：

- `page`: 页码
- `pageSize`: 每页条数
- `status`: 参与状态，可选值：enrolled, completed, abandoned

### 账号管理

#### 获取我的账号列表

```
GET /api/h5/accounts
```

#### 添加账号

```
POST /api/h5/accounts
```

请求参数：

```json
{
  "channelId": 1,
  "account": "账号名称",
  "homeUrl": "主页链接",
  "fansCount": 1000,
  "friendsCount": 500,
  "postsCount": 200
}
```

#### 更新账号

```
PUT /api/h5/accounts/{id}
```

### 群组相关

#### 获取我的群组

```
GET /api/h5/members/groups
```

#### 获取群主名下群组统计信息

```
GET /api/h5/members/groups/stats
```

响应数据：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "groupCount": 3,           // 群主拥有的群组数量
    "memberCount": 150,         // 群主名下所有群成员总数
    "totalCommission": 326.50,  // 群主累计获得的佣金总额
    "taskCount": 42            // 为群主带来收益的任务总数
  }
}
```

#### 获取为群主带来收益的任务列表

```
GET /api/h5/members/groups/commission-tasks
```

参数：

- `page`: 页码，默认1
- `pageSize`: 每页条数，默认10
- `startDate`: 开始日期，可选，格式：YYYY-MM-DD
- `endDate`: 结束日期，可选，格式：YYYY-MM-DD

响应数据：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "total": 42,
    "page": 1,
    "pageSize": 10,
    "list": [
      {
        "taskId": 101,
        "taskName": "抖音点赞任务",
        "channelId": 1,
        "channelName": "抖音",
        "rewardAmount": 10.00,     // 任务奖励金额
        "participantCount": 5,      // 群成员参与人数
        "commission": 5.00,         // 该任务为群主带来的佣金总额
        "createTime": "2023-06-01 10:00:00"  // 最近获得佣金的时间
      }
    ]
  }
}
```

#### 加入群组

```
POST /api/h5/groups/join
```

请求参数：

```json
{
  "groupId": 1
}
```

### 财务相关

#### 获取账户余额

```
GET /api/h5/member/balance
```

#### 获取账单记录

```
GET /api/h5/bills
```

参数：

- `page`: 页码
- `pageSize`: 每页条数
- `billType`: 账单类型，可选值：withdrawal, task_reward, invite_reward, group_owner_commission

#### 添加提现账户

```
POST /api/h5/withdrawal-accounts
```

请求参数：

```json
{
  "accountType": "alipay",
  "accountName": "账户姓名",
  "accountNumber": "账号",
  "isDefault": true
}
```

#### 申请提现

```
POST /api/h5/withdrawals
```

请求参数：

```json
{
  "withdrawalAccountId": 1,
  "amount": 100.00
}
```

#### 获取提现记录

```
GET /api/h5/withdrawals
```

### 上传接口

#### 上传图片

```
POST /api/shared/upload/image
```

表单参数：

- `file`: 图片文件

响应数据：

```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://example.com/uploads/images/filename.jpg"
  }
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权或认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 422 | 参数验证失败 |
| 500 | 服务器内部错误 |

## 接口限流规则

为保障系统安全和稳定，API接口实施了限流措施：

- 匿名访问：每IP 100次/分钟
- 已认证用户：每用户 300次/分钟
- 管理端API：每管理员 500次/分钟 