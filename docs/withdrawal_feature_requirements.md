# 提现功能需求文档

## 1. 数据库设计

### 1.1 提现账户表 (withdrawal_accounts)

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 账户ID，主键，自增 |
| member_id | bigint(20) | 会员ID，外键关联members表 |
| account_type | varchar(20) | 账户类型：Maya、GCash、Alipay |
| account | varchar(100) | 账号 |
| name | varchar(50) | 姓名 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

### 1.2 提现记录表 (withdrawals)

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | bigint(20) | 提现ID，主键，自增 |
| member_id | bigint(20) | 会员ID，外键关联members表 |
| withdrawal_account_id | bigint(20) | 提现账户ID，外键关联withdrawal_accounts表 |
| amount | decimal(10,2) | 申请提现金额 |
| withdrawal_status | varchar(20) | 提现状态：使用enums.js中的枚举常量 |
| waiter_id | bigint(20) | 审核员ID，外键关联waiters表 |
| reject_reason | varchar(255) | 拒绝原因 |
| remark | varchar(255) | 备注 |
| process_time | datetime | 处理时间 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |

## 2. 接口设计

### 2.1 H5端接口

#### 2.1.1 添加/编辑提现账户

- **接口路径**：`/api/h5/withdrawal-accounts`
- **请求方法**：POST (添加) / PUT (编辑)
- **请求参数**：
  - accountType: 账户类型
  - account: 账号
  - name: 姓名

#### 2.1.2 获取提现账户列表

- **接口路径**：`/api/h5/withdrawal-accounts`
- **请求方法**：GET
- **说明**：获取当前登录用户的所有提现账户，不需要分页

#### 2.1.3 提现申请

- **接口路径**：`/api/h5/withdrawals`
- **请求方法**：POST
- **请求参数**：
  - withdrawalAccountId: 提现账户ID
  - amount: 提现金额

#### 2.1.4 提现记录查询

- **接口路径**：`/api/h5/withdrawals`
- **请求方法**：GET
- **请求参数**：
  - page: 页码
  - pageSize: 每页条数
  - withdrawalStatus: 提现状态（可选）

### 2.2 Admin端接口

#### 2.2.1 提现记录管理

- **接口路径**：`/api/admin/withdrawals`
- **请求方法**：GET
- **请求参数**：
  - page: 页码
  - pageSize: 每页条数
  - memberId: 会员ID（可选）
  - withdrawalStatus: 提现状态（可选）
  - startTime: 开始时间（可选）
  - endTime: 结束时间（可选）
- **所需权限**：`finance:withdrawal`

#### 2.2.2 批量提现审核通过

- **接口路径**：`/api/admin/withdrawal/batchResolve`
- **请求方法**：PUT
- **请求参数**：
  - ids: 提现ID数组，例如 [1, 2, 3]
  - remark: 审核备注（可选）
- **所需权限**：`finance:withdrawal`

#### 2.2.3 批量提现拒绝

- **接口路径**：`/api/admin/withdrawal/batchReject`
- **请求方法**：PUT
- **请求参数**：
  - ids: 提现ID数组，例如 [1, 2, 3]
  - rejectReason: 拒绝原因
  - remark: 审核备注（可选）
- **所需权限**：`finance:withdrawal`

## 3. 枚举常量

在 `src/shared/config/enums.js` 中定义提现状态枚举常量：

```javascript
// 提现状态
const WITHDRAWAL_STATUS = {
  PENDING: 'pending',    // 待处理
  SUCCESS: 'success',    // 已完成
  FAILED: 'failed'    // 已拒绝
};

// 提现账户类型
const WITHDRAWAL_ACCOUNT_TYPE = {
  MAYA: 'maya',
  GCASH: 'gcash',
  ALIPAY: 'alipay'
};
```

## 4. 业务逻辑

1. 用户申请提现时，需检查账户余额是否充足
2. 提现申请成功后，冻结相应金额
3. 审核员审核通过后，更新用户余额，生成账单记录，账单类型为 withdrawal
4. 提现拒绝时，解冻相应金额，并记录拒绝原因