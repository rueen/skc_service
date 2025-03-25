<!--
 * @Author: diaochan
 * @Date: 2025-03-24 19:12:36
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-25 10:38:47
 * @Description: 
-->
# 奖励计算逻辑文档

## 一、数据库表结构

### bills表
- 如果表不存在则创建
- 字段结构：
  - `id`: 主键
  - `member_id`: 会员ID（获得奖励的会员）
  - `bill_type`: 账单类型（使用`src/shared/config/enums.js`中定义的枚举常量）
  - `amount`: 金额
  - `settlement_status`: 结算状态（使用`src/shared/config/enums.js`中定义的枚举常量）
  - `task_id`: 关联的任务ID
  - `related_member_id`: 关联的会员ID（如邀请奖励关联被邀请人ID，群主收益关联完成任务会员ID）
  - `failure_reason`: 结算失败原因（当settlement_status为failed时记录）

## 二、奖励计算规则

当会员完成任务（即任务审核通过）时，系统需要计算并分配不同类型的奖励：

### 1. 任务奖励
- 所有完成任务的会员都能获得任务详情中配置的任务奖励(reward)
- 这是基础奖励，无论是否首次完成任务都会获得

### 2. 邀请奖励
- 仅在会员**首次**完成任务时触发
- 该会员的邀请人（如果存在）将获得固定金额的奖励
- 邀请奖励金额通过系统配置参数`invite_reward_amount`指定

### 3. 群主收益
- 仅在会员**非首次**完成任务时触发
- 该会员所在群组的群主可以获得任务奖励的一定比例
- 收益比例通过系统配置参数`group_owner_commission_rate`指定
- 补充：如果完成任务的是群主本人，也需要叠加群主收益

## 三、结算流程

### 1. 账单记录
- 系统需要为每笔奖励自动创建对应的账单记录
- 初始结算状态为pending

### 2. 结算处理
- 尝试将收益结算至会员的账户余额
- 结算结果处理：
  - 成功：更新账单状态为success
  - 失败：更新账单状态为failed，并记录失败原因

## 四、示例场景

### 基础数据
- 任务奖励：100
- 群主收益率：10%
- 邀请奖励金额：5
- 关系：会员b是会员a的邀请人，会员c是会员a和会员b的群主

### 案例1：会员a首次完成任务（假设结算成功）
- 会员a获得：100（任务奖励）
  - 账单记录：{member_id: a, bill_type: BILL_TYPE.TASK_REWARD, amount: 100, task_id: task_id, related_member_id: null, settlement_status: SETTLEMENT_STATUS.SUCCESS}
- 会员b获得：5（邀请奖励）
  - 账单记录：{member_id: b, bill_type: BILL_TYPE.INVITE_REWARD, amount: 5, task_id: task_id, related_member_id: a, settlement_status: SETTLEMENT_STATUS.SUCCESS}
- 会员c获得：0（首次完成不触发群主收益）

### 案例2：会员a非首次完成任务（假设结算失败）
- 会员a获得：100（任务奖励）
  - 账单记录：{member_id: a, bill_type: BILL_TYPE.TASK_REWARD, amount: 100, task_id: task_id, related_member_id: null, settlement_status: SETTLEMENT_STATUS.FAILED, failure_reason: "账户余额更新失败"}
- 会员b获得：0（非首次不触发邀请奖励）
- 会员c获得：10（群主收益 = 100 × 10%）
  - 账单记录：{member_id: c, bill_type: BILL_TYPE.GROUP_OWNER_COMMISSION, amount: 10, task_id: task_id, related_member_id: a, settlement_status: SETTLEMENT_STATUS.FAILED, failure_reason: "账户余额更新失败"}

### 案例3：群主c完成任务
- 会员c获得：100（任务奖励）+ 10（群主收益 = 100 × 10%）
  - 账单记录1：{member_id: c, bill_type: BILL_TYPE.TASK_REWARD, amount: 100, task_id: task_id, related_member_id: null, settlement_status: SETTLEMENT_STATUS.SUCCESS}
  - 账单记录2：{member_id: c, bill_type: BILL_TYPE.GROUP_OWNER_COMMISSION, amount: 10, task_id: task_id, related_member_id: c, settlement_status: SETTLEMENT_STATUS.SUCCESS}
- 邀请人获得：5（如果是首次完成）
  - 账单记录：{member_id: inviter_id, bill_type: BILL_TYPE.INVITE_REWARD, amount: 5, task_id: task_id, related_member_id: c, settlement_status: SETTLEMENT_STATUS.SUCCESS} 