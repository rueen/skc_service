# API 文档

## 简介

本文档提供了本系统的API接口说明，包括Support端（管理后台）和H5端（用户前端）的API。

## 基础信息

- 基础URL:
  - 开发环境:
    - Support端: `http://localhost:3002/api/support`
    - H5端: `http://localhost:3001/api/h5`
  - 生产环境:
    - Support端: `https://api.example.com/api/support`
    - H5端: `https://api.example.com/api/h5`

- 身份验证:
  - Support端使用JWT令牌，在请求头中添加 `Authorization: Bearer <token>`
  - H5端同样使用JWT令牌，在请求头中添加 `Authorization: Bearer <token>`

- 响应格式:
  ```json
  {
    "code": 200,
    "data": {},
    "message": "操作成功"
  }
  ```

- 错误响应:
  ```json
  {
    "code": 400,
    "message": "错误信息"
  }
  ```

## Support端 API

### 1. 会员管理

#### 1.1 获取会员列表

- **URL**: `/members`
- **方法**: `GET`
- **权限**: 需要管理员权限
- **参数**:
  - `page`: 页码，默认值：1
  - `pageSize`: 每页数量，默认值：10
  - `keyword`: 搜索关键字，可选
  - `groupId`: 群组ID，可选
  - `status`: 会员状态，可选

- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "list": [
        {
          "id": 1,
          "nickname": "用户昵称",
          "phone": "13800138000",
          "avatar": "https://example.com/avatar.jpg",
          "inviterNickname": "邀请人昵称",
          "balance": "100.00",
          "createTime": "2023-01-01 12:00:00"
        }
      ],
      "total": 100,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```

#### 1.2 创建会员

- **URL**: `/members`
- **方法**: `POST`
- **权限**: 需要管理员权限
- **请求体**:
  ```json
  {
    "nickname": "用户昵称",
    "phone": "13800138000",
    "password": "abc12345678",
    "groupIds": [1, 2],
    "balance": "0.00"
  }
  ```

- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "id": 1,
      "nickname": "用户昵称",
      "phone": "13800138000",
      "avatar": "https://example.com/default-avatar.jpg",
      "balance": "0.00",
      "createTime": "2023-01-01 12:00:00"
    },
    "message": "创建成功"
  }
  ```

### 2. 任务管理

#### 2.1 获取任务列表

- **URL**: `/tasks`
- **方法**: `GET`
- **权限**: 需要管理员权限
- **参数**:
  - `page`: 页码，默认值：1
  - `pageSize`: 每页数量，默认值：10
  - `keyword`: 搜索关键字，可选
  - `status`: 任务状态，可选
  - `channelId`: 渠道ID，可选

- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "list": [
        {
          "id": 1,
          "taskName": "示例任务",
          "status": "processing",
          "channel": "facebook",
          "startTime": "2023-01-01T12:00:00.000Z",
          "endTime": "2023-01-10T12:00:00.000Z",
          "reward": "10.00",
          "quota": 100,
          "appliedCount": 20,
          "createTime": "2023-01-01 12:00:00"
        }
      ],
      "total": 50,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```

## H5端 API

### 1. 会员登录/注册

#### 1.1 会员登录

- **URL**: `/auth/login`
- **方法**: `POST`
- **请求体**:
  ```json
  {
    "phone": "13800138000",
    "password": "abc12345678",
    "inviteCode": "ABC123" // 可选，邀请码
  }
  ```

- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "userInfo": {
        "id": 1,
        "nickname": "用户昵称",
        "phone": "13800138000",
        "avatar": "https://example.com/avatar.jpg",
        "balance": "100.00",
        "inviterNickname": "邀请人昵称",
        "inviteCode": "XYZ789"
      }
    },
    "message": "登录成功"
  }
  ```

### 2. 任务相关

#### 2.1 获取任务列表

- **URL**: `/tasks`
- **方法**: `GET`
- **参数**:
  - `page`: 页码，默认值：1
  - `pageSize`: 每页数量，默认值：10
  - `status`: 任务状态，可选

- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "list": [
        {
          "id": 1,
          "taskName": "示例任务",
          "status": "processing",
          "channel": "facebook",
          "reward": "10.00",
          "startTime": "2023-01-01T12:00:00.000Z",
          "endTime": "2023-01-10T12:00:00.000Z",
          "description": "任务描述...",
          "isApplied": true,
          "applicationStatus": "pending"
        }
      ],
      "total": 20,
      "page": 1,
      "pageSize": 10
    },
    "message": "获取成功"
  }
  ```

#### 2.2 申请任务

- **URL**: `/task-applications`
- **方法**: `POST`
- **权限**: 需要会员登录
- **请求体**:
  ```json
  {
    "taskId": 1
  }
  ```

- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "id": 1,
      "taskId": 1,
      "memberId": 1,
      "status": "pending",
      "createTime": "2023-01-01 12:00:00"
    },
    "message": "申请成功"
  }
  ```

### 3. 账户相关

#### 3.1 获取账户信息

- **URL**: `/members/me`
- **方法**: `GET`
- **权限**: 需要会员登录
- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "id": 1,
      "nickname": "用户昵称",
      "phone": "13800138000",
      "avatar": "https://example.com/avatar.jpg",
      "balance": "100.00",
      "inviterNickname": "邀请人昵称",
      "inviteCode": "XYZ789",
      "groups": [
        {
          "id": 1,
          "groupName": "示例群组",
          "isOwner": true
        }
      ]
    },
    "message": "获取成功"
  }
  ```

#### 3.2 申请提现

- **URL**: `/withdrawals`
- **方法**: `POST`
- **权限**: 需要会员登录
- **请求体**:
  ```json
  {
    "withdrawalAccount": "13800138000",
    "withdrawalAccountType": "alipay",
    "amount": "50.00",
    "realName": "张三"
  }
  ```

- **响应示例**:
  ```json
  {
    "code": 200,
    "data": {
      "id": 1,
      "memberId": 1,
      "withdrawalAccount": "13800138000",
      "withdrawalAccountType": "alipay",
      "amount": "50.00",
      "realName": "张三",
      "withdrawalStatus": "pending",
      "applyTime": "2023-01-01 12:00:00"
    },
    "message": "申请成功"
  }
  ```

## 状态码说明

- 200: 成功
- 400: 请求错误
- 401: 未授权
- 403: 禁止访问
- 404: 资源不存在
- 500: 服务器错误

## 注意事项

1. 所有需要会员身份的API都需要在请求头中包含有效的JWT令牌
2. 日期时间格式遵循ISO 8601标准
3. 金额字段使用字符串类型，保留两位小数 