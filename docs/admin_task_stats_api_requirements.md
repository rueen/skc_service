<!--
 * @Author: diaochan
 * @Date: 2025-03-26 11:50:22
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-26 11:55:14
 * @Description: 
-->
# admin端会员任务信息统计接口需求文档

## 一、接口概述

为admin端新增会员任务信息统计接口，方便平台小二查看指定会员的任务完成情况和获得的奖励信息。

## 二、接口详情

### 1. 获取会员任务数据统计接口

**接口路径**：`GET /api/admin/members/:memberId/task/stats`

**接口描述**：获取指定会员的任务完成情况和奖励统计信息

**响应数据**：
```json
{
  "completedTaskCount": 15,     // 完成任务次数
  "totalTaskReward": 150.00     // 累计任务奖励（单位：元）
}
```

**数据来源**：
- `completedTaskCount`: 从`submitted_tasks`表统计`member_id`为当前会员ID且`task_audit_status`为`approved`的记录数
- `totalTaskReward`: 从`bills`表统计当前会员的`bill_type`为`task_reward`的账单总金额

**接口权限**：'member:view'

## 三、数据关系说明

根据已有系统设计，会员任务关系与奖励的处理如下：

1. 会员完成任务并提交，管理员审核通过后，该任务被视为完成
2. 在`submitted_tasks`表中记录会员提交的任务，`task_audit_status`字段标记审核状态
3. 任务审核通过后，系统会在`bills`表中生成一条记录：
   - `member_id`为当前会员的ID（获得奖励的会员）
   - `bill_type`为`task_reward`
   - `amount`为任务的奖励金额
   - `task_id`为完成的任务ID

## 四、技术实现要点

1. 使用统一的日期时间格式：`YYYY-MM-DD HH:mm:ss`
2. 字段名使用驼峰命名法（camelCase）与现有API保持一致
3. 确保对大数据量的任务记录有良好的性能表现
4. 处理好边界情况，例如会员不存在或没有任务完成记录时的返回值 