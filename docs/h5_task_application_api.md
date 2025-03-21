# H5端任务报名API

## 目录
- [基本信息](#基本信息)
- [任务报名相关API](#任务报名相关api)
  - [报名任务](#报名任务)
  - [获取已报名任务列表](#获取已报名任务列表)
  - [提交任务](#提交任务)

## 基本信息

- 接口基础地址: `/api/h5`
- 需要认证的接口在请求头中需要包含 token: `Authorization: Bearer <token>`
- 返回数据格式统一为:

```json
{
  "code": 0,         // 状态码，0 表示成功
  "message": "",     // 提示信息
  "data": {}         // 响应数据
}
```

## 任务报名相关API

### 报名任务

- **接口URL**: `/tasks/apply/:id`
- **请求方式**: `POST`
- **接口说明**: 用户报名参加指定任务。需要注意，报名有门槛，不是所有会员都有资格报名，需先通过报名接口申请
- **需要认证**: 是

#### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|--------|------|------|------|
| id | 是 | number | 任务ID（路径参数） |

#### 响应示例

```json
{
  "code": 0,
  "message": "任务报名成功",
  "data": {
    "id": 1       // 报名记录ID
  }
}
```

### 获取已报名任务列表

- **接口URL**: `/tasks/applications`
- **请求方式**: `GET`
- **接口说明**: 获取当前用户已报名的任务列表，包括已提交和已完成的任务
- **需要认证**: 是

#### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|--------|------|------|------|
| page | 否 | number | 页码，默认1 |
| pageSize | 否 | number | 每页条数，默认10 |
| status | 否 | string | 任务状态筛选，可选值：applied(已报名)、submitted(已提交)、completed(已完成) |

#### 响应示例

```json
{
  "code": 0,
  "message": "",
  "data": {
    "list": [
      {
        "id": 1,
        "taskId": 1,
        "memberId": 1,
        "taskName": "测试任务",
        "channelName": "抖音",
        "reward": 100,
        "status": "applied",
        "applyTime": "2025-03-20 10:00:00",
        "createTime": "2025-03-20 10:00:00",
        "updateTime": "2025-03-20 10:00:00"
      },
      {
        "id": 2,
        "taskId": 2,
        "memberId": 1,
        "taskName": "测试任务2",
        "channelName": "抖音",
        "reward": 200,
        "status": "submitted",
        "taskAuditStatus": "pending",  // 已提交任务会额外返回审核状态
        "submitTime": "2025-03-20 11:00:00",  // 已提交任务会额外返回提交时间
        "applyTime": "2025-03-20 10:30:00",
        "createTime": "2025-03-20 10:30:00",
        "updateTime": "2025-03-20 11:00:00"
      }
    ],
    "total": 2,
    "page": 1,
    "pageSize": 10
  }
}
```

### 提交任务

- **接口URL**: `/tasks/submit/:id`
- **请求方式**: `POST`
- **接口说明**: 提交任务完成内容。**注意：必须先报名任务后才能提交，未报名的任务不允许提交**
- **需要认证**: 是

#### 请求参数

| 参数名 | 必选 | 类型 | 说明 |
|--------|------|------|------|
| id | 是 | number | 任务ID（路径参数） |
| submitContent | 是 | array | 提交内容，根据任务要求填写 |

#### 请求示例

```json
{
  "submitContent": [
    {
      "title": "帖子链接",
      "value": "https://example.com/post/123"
    },
    {
      "title": "数据截图",
      "value": "https://example.com/images/screenshot.jpg"
    }
  ]
}
```

#### 响应示例

```json
{
  "code": 0,
  "message": "任务提交成功，请等待审核",
  "data": {
    "id": 1       // 提交记录ID
  }
}
```

#### 错误响应

```json
{
  "code": 400,
  "message": "您尚未报名该任务，请先报名后再提交",
  "data": null
}
``` 