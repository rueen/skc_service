-- 修复bills表中bill_type字段长度不足的问题
ALTER TABLE bills MODIFY COLUMN bill_type varchar(50) NOT NULL COMMENT '账单类型：withdrawal-提现，task_reward-任务奖励，invite_reward-邀请奖励，group_owner_commission-群主收益';

-- 确保members表有balance字段
ALTER TABLE members ADD COLUMN IF NOT EXISTS balance decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '账户余额'; 