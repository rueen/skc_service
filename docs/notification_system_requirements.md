<!--
 * @Author: diaochan
 * @Date: 2025-03-29 20:58:32
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-29 21:07:56
 * @Description: 
-->
# 通知系统需求文档

## 1. 数据库设计

### 1.1 通知表设计 (notifications)

| 字段名 | 类型 | 描述 | 备注 |
|-------|------|------|------|
| id | int | 主键 | 自增 |
| member_id | varchar(50) | 会员ID | '*' 表示所有用户 |
| notification_type | tinyint | 通知类型 | 0-账号审核通过；1-账号审核拒绝；后续会添加更多类型 |
| title | varchar(100) | 通知标题 | |
| content | text | 通知内容 | JSON格式，无需做格式校验 |
| is_read | tinyint | 是否已读 | 0-未读 1-已读，接口触发状态变更 |
| create_time | datetime | 创建时间 | |
| update_time | datetime | 更新时间 | |

## 2. 业务逻辑

### 2.1 账号审核通过触发通知

- 管理端账号审核通过，自动为会员分配群组后，触发通知
- 已存在所属群组的会员账号审核通过后，不触发通知
- 通知内容格式：

```json
{
    "account": "123", // accounts表中的 account 字段
    "groupName": "", // groups表中的 group_name 字段
    "groupLink": ""  // groups表中的 group_link 字段
}
```

### 2.2 账号审核拒绝触发通知

- 管理端账号审核拒绝后，触发通知
- 通知内容格式：

```json
{
    "account": "123", // accounts表中的 account 字段
    "rejectReason": "" // accounts表中的 reject_reason 字段
}
```

## 3. 接口设计

### 3.1 H5端获取通知接口

- 接口路径：`GET /api/h5/notifications`
- 功能：获取当前用户未读通知
- 返回数据：数组格式，按创建时间倒序排序（最新通知优先）
- 不需要分页，只返回所有未读通知

### 3.2 H5端关闭通知接口

- 接口路径：`PUT /api/h5/notifications/:id/read`
- 功能：将指定通知标记为已读（更改 is_read 状态为1）
- 参数：通知ID

## 4. 实现注意事项

1. 确保通知表加入合适的索引，尤其是针对 member_id 和 is_read 字段
2. 通知生成应以异步方式处理，避免影响账号审核的主流程
3. 通知内容（content字段）存储为JSON字符串，读取时需要解析
4. 暂不提供历史通知查询接口 