# 群组相关接口文档

## H5端接口

### 1. 获取当前会员所属群列表

#### 接口信息
- 请求路径：`GET /api/h5/members/groups`
- 功能描述：获取当前登录会员加入的所有群组信息
- 权限要求：需要登录

#### 返回数据
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "群ID",
      "name": "群名称",
      "link": "群链接",
      "isOwner": true/false,
      "memberCount": 100,
      "totalEarnings": 1000.00,  // 仅当 isOwner 为 true 时返回
      "createTime": "2024-03-20 10:00:00"
    }
  ]
}
```

### 2. 获取群主名下群统计信息

#### 接口信息
- 请求路径：`GET /api/h5/members/groups/stats`
- 功能描述：获取当前会员作为群主的统计信息
- 权限要求：需要登录，且当前会员必须是群主

#### 返回数据
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "groupCount": 5,
    "totalEarnings": 5000.00
  }
}
```

### 3. 获取群成员列表

#### 接口信息
- 请求路径：`GET /api/h5/members/groups/:groupId/members`
- 功能描述：获取指定群组的成员列表
- 权限要求：需要登录，且当前会员必须是该群的群主

#### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| groupId | string | 是 | 群ID（路径参数）|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

#### 返回数据
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "list": [
      {
        "id": "会员ID",
        "avatar": "会员头像URL",
        "nickname": "会员昵称",
        "account": "会员账号",
        "joinTime": "2024-03-20 10:00:00",
        "taskCount": 5,
        "earnings": 500.00
      }
    ]
  }
}
```

## Admin端接口

### 1. 获取群主名下群统计信息

#### 接口信息
- 请求路径：`GET /api/admin/members/:memberId/groups/stats`
- 功能描述：获取指定会员作为群主的统计信息
- 权限要求：需要管理员权限，且入参的会员必须是群主

#### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| memberId | string | 是 | 会员ID（路径参数）|

#### 返回数据
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "groupCount": 5,
    "totalEarnings": 5000.00
  }
}
```

## 数据来源说明

1. **群组信息**
   - 来源表：`groups`
   - 主要字段：id, name, link, create_time

2. **群成员关系**
   - 来源表：`group_members`
   - 主要字段：group_id, member_id, join_time, is_owner

3. **群主收益**
   - 来源表：`bills`
   - 关联条件：bill_type = 'group_owner_commission'
   - 关联字段：related_group_id

4. **会员完成任务次数**
   - 来源表：`submitted_tasks`
   - 统计条件：task_audit_status = 'approved'
   - 关联字段：member_id

## 注意事项

1. 所有时间字段统一使用 'YYYY-MM-DD HH:mm:ss' 格式
2. 金额字段保留两位小数
3. 接口返回的字段名使用驼峰命名法（camelCase）
4. 需要确保接口的权限控制正确实现
5. 对于大数据量的群成员列表，建议使用分页查询 