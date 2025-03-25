<!--
 * @Author: diaochan
 * @Date: 2025-03-25 10:38:44
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-25 10:57:09
 * @Description: 
-->
# H5端会员邀请数据接口需求文档

## 一、接口概述

为H5端新增两个与会员邀请相关的接口，方便会员查看自己的邀请数据和管理邀请关系。

## 二、接口详情

### 1. 获取会员邀请数据统计接口

**接口路径**：`GET /api/h5/members/invite/stats`

**接口描述**：获取当前登录会员的邀请数据统计信息

**请求参数**：无（使用token鉴权获取当前会员信息）

**响应数据**：
```json
{
  "inviteCount": 10,       // 累计邀请人数
  "totalReward": 50.00     // 累计邀请奖励（单位：元）
}
```

**数据来源**：
- `inviteCount`: 从`members`表统计`inviter_id`为当前会员ID的记录数
- `totalReward`: 从`bills`表统计当前会员的`bill_type`为`invite_reward`的账单总金额

### 2. 获取会员邀请好友列表接口

**接口路径**：`GET /api/h5/members/invite/friends`

**接口描述**：分页获取当前登录会员邀请的所有好友信息

**请求参数**：
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认10）

**响应数据**：
```json
{
  "total": 100,            // 总记录数
  "page": 1,               // 当前页码
  "pageSize": 10,          // 每页数量
  "list": [
    {
      "id": 1,                                    // 被邀请会员ID
      "nickname": "张三",                          // 被邀请会员昵称
      "account": "zhangsan123",                   // 被邀请会员账号
      "avatar": "https://example.com/avatar.jpg", // 被邀请会员头像
      "inviteTime": "2025-03-20 12:30:00",        // 邀请关系绑定时间
      "firstTaskTime": "2025-03-21 15:45:00",     // 首次完成任务时间（如未完成则为null）
      "inviteReward": 5.00                        // 该好友为邀请人带来的邀请奖励（如未完成任务则为0）
    },
    // ... 更多记录
  ]
}
```

**数据来源**：
- 基本信息：从`members`表获取`inviter_id`为当前会员ID的会员记录
- `inviteTime`：会员的`create_time`字段，表示建立邀请关系的时间
- `firstTaskTime`：从`submitted_tasks`表查询会员首次通过审核的任务提交时间
- `inviteReward`：从`bills`表获取当前会员的邀请奖励账单，匹配`related_member_id`和被邀请会员ID

## 三、数据关系说明

根据奖励计算逻辑，会员邀请关系与奖励的处理如下：

1. 会员A邀请会员B注册，在会员B的记录中，`inviter_id`字段记录了会员A的ID
2. 当会员B首次完成任务（任务审核通过）时，会员A获得系统配置的固定金额邀请奖励
3. 这笔奖励会在`bills`表中生成一条记录：
   - `member_id`为会员A的ID（获得奖励的会员）
   - `bill_type`为`invite_reward`
   - `amount`为系统配置的邀请奖励金额
   - `task_id`为会员B完成的任务ID
   - `related_member_id`为会员B的ID（完成任务的被邀请会员）

## 四、技术实现要点

1. 使用统一的日期时间格式：`YYYY-MM-DD HH:mm:ss`
2. 字段名使用驼峰命名法（camelCase）与现有API保持一致
3. 确保对大数据量的邀请记录有良好的性能表现
4. 合理处理无邀请记录、无首次任务完成记录等边界情况 