/**
 * 数据库初始化脚本
 * 创建所有必要的数据库表
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');

// 创建账号表
const createAccountsTable = `
CREATE TABLE IF NOT EXISTS accounts (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账号ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  channel_id bigint(20) NOT NULL COMMENT '渠道ID',
  account varchar(100) NOT NULL COMMENT '账号',
  uid varchar(100) DEFAULT NULL COMMENT '平台用户唯一标识',
  home_url varchar(255) DEFAULT NULL COMMENT '主页链接',
  fans_count int(11) DEFAULT 0 COMMENT '粉丝数量',
  friends_count int(11) DEFAULT 0 COMMENT '好友数量',
  posts_count int(11) DEFAULT 0 COMMENT '发布数量',
  account_audit_status varchar(20) DEFAULT 'pending' COMMENT '账号审核状态：pending-待审核，approved-已通过，rejected-已拒绝',
  reject_reason varchar(255) DEFAULT NULL COMMENT '拒绝原因',
  reject_times int(11) NOT NULL DEFAULT 0 COMMENT '驳回次数',
  waiter_id bigint(20) DEFAULT NULL COMMENT '审核小二ID',
  audit_time datetime DEFAULT NULL COMMENT '审核时间',
  submit_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交/修改时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_uid (uid),
  KEY idx_member_id (member_id),
  KEY idx_channel_id (channel_id),
  KEY idx_account_audit_status (account_audit_status),
  KEY idx_waiter_id (waiter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账户表';
`;

// 创建文章表
const createArticlesTable = `
CREATE TABLE IF NOT EXISTS articles (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '文章ID',
  title varchar(200) NOT NULL COMMENT '文章标题',
  content text NOT NULL COMMENT '文章内容',
  location varchar(50) NULL DEFAULT NULL COMMENT '文章位置标识，可为空',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';
`;

// 初始化文章
const initUserAgreement = `
INSERT INTO articles (title, content, location) 
SELECT '用户协议', '用户协议内容', 'userAgreement'
FROM dual 
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE location = 'userAgreement')
`;

const initPrivacyPolicy = `
INSERT INTO articles (title, content, location) 
SELECT '隐私政策', '隐私政策内容', 'privacyPolicy'
FROM dual 
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE location = 'privacyPolicy')
`;

// 创建账单表
const createBillsTable = `
CREATE TABLE IF NOT EXISTS bills (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账单ID',
  bill_no varchar(64) NOT NULL COMMENT '账单编号',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  bill_type varchar(50) NOT NULL COMMENT '账单类型：withdrawal-提现，task_reward-任务奖励，invite_reward-邀请奖励，group_owner_commission-群主收益，reward_grant-奖励发放，reward_deduction-奖励扣除',
  amount decimal(10,2) NOT NULL COMMENT '金额',
  settlement_status varchar(20) DEFAULT NULL COMMENT '结算状态：success-结算成功，failed-结算失败，pending-等待结算',
  withdrawal_status varchar(20) DEFAULT NULL COMMENT '提现状态：pending-待处理，success-已完成，failed-已拒绝',
  task_id bigint(20) DEFAULT NULL COMMENT '关联的任务ID',
  withdrawal_id bigint(20) DEFAULT NULL COMMENT '关联的提现ID',
  related_member_id bigint(20) DEFAULT NULL COMMENT '关联的会员ID',
  related_group_id bigint(20) DEFAULT NULL COMMENT '关联的群组ID',
  waiter_id bigint(20) DEFAULT NULL COMMENT '操作人ID',
  failure_reason varchar(255) DEFAULT NULL COMMENT '结算失败原因',
  remark varchar(255) DEFAULT NULL COMMENT '备注说明',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_bill_no (bill_no),
  KEY idx_member_id (member_id),
  KEY idx_bill_type (bill_type),
  KEY idx_settlement_status (settlement_status),
  KEY idx_withdrawal_status (withdrawal_status),
  KEY idx_task_id (task_id),
  KEY idx_withdrawal_id (withdrawal_id),
  KEY idx_related_member_id (related_member_id),
  KEY idx_related_group_id (related_group_id),
  KEY idx_waiter_id (waiter_id),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账单表';
`;

// 创建FB老账号表
const createOldAccountsFbTable = `
CREATE TABLE IF NOT EXISTS old_accounts_fb (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  uid varchar(100) NOT NULL COMMENT 'FB账户标识，唯一',
  nickname varchar(100) NOT NULL COMMENT 'FB昵称',
  home_url varchar(255) DEFAULT NULL COMMENT 'FB链接',
  member_id bigint(20) DEFAULT NULL COMMENT '关联会员ID，可为空',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_uid (uid),
  KEY idx_member_id (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='FB老账号表';
`;

// 创建会员_FB老账号关联表
const createMemberOldAccountsFbTable = `
CREATE TABLE IF NOT EXISTS member_old_accounts_fb (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '主键，自增',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  old_accounts_fb_id bigint(20) NOT NULL COMMENT 'FB老账号ID',
  bind_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_member_old_account (member_id, old_accounts_fb_id),
  KEY idx_member_id (member_id),
  KEY idx_old_accounts_fb_id (old_accounts_fb_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员_FB老账号关联表';
`;

// 创建渠道表
const createChannelsTable = `
CREATE TABLE IF NOT EXISTS channels (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '渠道ID',
  name varchar(50) NOT NULL COMMENT '渠道名称',
  icon varchar(255) DEFAULT NULL COMMENT '渠道图标URL',
  custom_fields json DEFAULT NULL COMMENT '自定义字段配置，JSON格式',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='渠道表';
`;

// 创建群组表
const createGroupsTable = `
CREATE TABLE IF NOT EXISTS \`groups\` (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '群组ID',
  group_name varchar(100) NOT NULL COMMENT '群组名称',
  group_link varchar(255) DEFAULT NULL COMMENT '群组链接',
  owner_id bigint(20) DEFAULT NULL COMMENT '群主ID',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_owner_id (owner_id),
  KEY idx_group_name (group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组表';
`;

// 创建会员群组关联表
const createMemberGroupsTable = `
CREATE TABLE IF NOT EXISTS member_groups (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '关联ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  group_id bigint(20) NOT NULL COMMENT '群组ID',
  is_owner tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否群主：0-否，1-是',
  join_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_member_group (member_id, group_id),
  KEY idx_member_id (member_id),
  KEY idx_group_id (group_id),
  KEY idx_is_owner (is_owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员群组关联表';
`;

// 创建会员表
const createMembersTable = `
CREATE TABLE IF NOT EXISTS members (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '会员ID',
  nickname varchar(50) NOT NULL COMMENT '会员昵称',
  account varchar(50) NOT NULL COMMENT '会员账号',
  password varchar(255) NOT NULL COMMENT '密码（加密存储）',
  inviter_id bigint(20) DEFAULT NULL COMMENT '邀请人ID',
  occupation varchar(20) DEFAULT NULL COMMENT '职业：housewife-宝妈，freelancer-自由职业，student-学生',
  invite_code varchar(10) NOT NULL COMMENT '邀请码',
  phone varchar(20) DEFAULT NULL COMMENT '手机号',
  area_code varchar(10) DEFAULT NULL COMMENT '手机区号',
  email varchar(100) DEFAULT NULL COMMENT '邮箱',
  avatar varchar(255) DEFAULT NULL COMMENT '头像URL',
  gender tinyint(1) DEFAULT 2 COMMENT '性别：0-男，1-女，2-保密',
  balance decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '账户余额',
  telegram varchar(50) DEFAULT NULL COMMENT 'Telegram账号',
  register_source varchar(20) NOT NULL DEFAULT 'h5' COMMENT '注册来源：admin-管理端添加，h5-H5端注册',
  is_new tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否新人：0-否，1-是',
  password_changed_time datetime DEFAULT NULL COMMENT '密码最后修改时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_account (account),
  UNIQUE KEY uk_invite_code (invite_code),
  UNIQUE KEY uk_phone (phone),
  KEY idx_inviter_id (inviter_id),
  KEY idx_create_time (create_time),
  KEY idx_register_source (register_source),
  KEY idx_is_new (is_new)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员信息表';
`;

// 创建系统配置表
const createSystemConfigTable = `
CREATE TABLE IF NOT EXISTS system_config (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  config_key varchar(50) NOT NULL COMMENT '配置键',
  config_value text NOT NULL COMMENT '配置值',
  description varchar(255) DEFAULT NULL COMMENT '配置描述',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_config_key (config_key),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';
`;
// 系统配置初始数据
const initSystemConfig = `
INSERT INTO system_config (config_key, config_value, description) 
VALUES 
('max_group_members', '200', '群组最大成员数'),
('group_owner_commission_rate', '0.1', '群主收益率（0-1之间的小数）'),
('invite_reward_amount', '5.00', '邀请奖励金额（元）'),
('withdrawal_threshold', '50', '提现门槛（元）'),
('account_reject_times', '-1', '账号可驳回次数，-1:不限制；0:驳回后不可提交；1:驳回后可提交1次，再次驳回不可提交；'),
('task_reject_times', '-1', '任务可驳回次数，-1:不限制；0:驳回后不可提交；1:驳回后可提交1次，再次驳回不可提交；')
ON DUPLICATE KEY UPDATE update_time = NOW();
`;

// 创建任务表
const createTasksTable = `
CREATE TABLE IF NOT EXISTS tasks (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  task_name varchar(100) NOT NULL COMMENT '任务名称',
  channel_id bigint(20) NOT NULL COMMENT '渠道ID',
  category varchar(50) DEFAULT NULL COMMENT '任务类别',
  task_type varchar(50) NOT NULL COMMENT '任务类型',
  reward decimal(10,2) NOT NULL COMMENT '任务奖励金额',
  brand varchar(100) DEFAULT NULL COMMENT '品牌名称',
  group_ids json DEFAULT NULL COMMENT '关联的群组ID列表，JSON格式',
  group_mode tinyint(1) NOT NULL DEFAULT 0 COMMENT '群组模式：0-不指定，1-指定群组',
  user_range tinyint(1) NOT NULL DEFAULT 0 COMMENT '用户范围：0-全部用户，1-完成任务次数',
  task_count int(11) NOT NULL DEFAULT 1 COMMENT '任务数量',
  custom_fields json DEFAULT NULL COMMENT '自定义字段，JSON格式',
  start_time datetime NOT NULL COMMENT '任务开始时间',
  end_time datetime NOT NULL COMMENT '任务结束时间',
  unlimited_quota tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否不限制名额：0-限制，1-不限制',
  quota int(11) DEFAULT 0 COMMENT '任务名额',
  fans_required int(11) DEFAULT 0 COMMENT '要求粉丝数',
  content_requirement text DEFAULT NULL COMMENT '内容要求',
  task_info text NOT NULL COMMENT '任务详情',
  notice text DEFAULT NULL COMMENT '任务须知',
  task_status varchar(20) NOT NULL DEFAULT 'not_started' COMMENT '任务状态：not_started-未开始，processing-进行中，ended-已结束',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_channel_id (channel_id),
  KEY idx_task_status (task_status),
  KEY idx_start_time (start_time),
  KEY idx_end_time (end_time),
  KEY idx_task_type (task_type),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';
`;

// 创建已报名任务表
const createEnrolledTasksTable = `
CREATE TABLE IF NOT EXISTS enrolled_tasks (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '报名ID',
  task_id bigint(20) NOT NULL COMMENT '任务ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  enroll_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  related_group_id bigint(20) DEFAULT NULL COMMENT '关联的群组ID',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_member (task_id, member_id),
  KEY idx_task_id (task_id),
  KEY idx_member_id (member_id),
  KEY idx_related_group_id (related_group_id),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已报名任务表';
`;

// 创建已提交任务表
const createTaskSubmittedTable = `
CREATE TABLE IF NOT EXISTS submitted_tasks (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '提交ID',
  task_id bigint(20) NOT NULL COMMENT '任务ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  submit_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  submit_content text NOT NULL COMMENT '提交内容',
  task_pre_audit_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '预审状态：pending-待审核，approved-已通过，rejected-已拒绝',
  pre_waiter_id bigint(20) DEFAULT NULL COMMENT '初审小二ID',
  pre_audit_time datetime DEFAULT NULL COMMENT '预审时间',
  task_audit_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending-待审核，approved-已通过，rejected-已拒绝',
  waiter_id bigint(20) DEFAULT NULL COMMENT '审核小二ID',
  audit_time datetime DEFAULT NULL COMMENT '审核时间',
  reject_reason varchar(255) DEFAULT NULL COMMENT '拒绝原因',
  reject_times int(11) NOT NULL DEFAULT 0 COMMENT '驳回次数',
  related_group_id bigint(20) DEFAULT NULL COMMENT '关联的群组ID',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_member (task_id, member_id),
  KEY idx_task_id (task_id),
  KEY idx_member_id (member_id),
  KEY idx_task_audit_status (task_audit_status),
  KEY idx_task_pre_audit_status (task_pre_audit_status),
  KEY idx_waiter_id (waiter_id),
  KEY idx_pre_waiter_id (pre_waiter_id),
  KEY idx_related_group_id (related_group_id),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已提交任务表';
`;

// 创建小二表
const createWaitersTable = `
CREATE TABLE IF NOT EXISTS waiters (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '小二ID',
  username varchar(50) NOT NULL COMMENT '用户名',
  password varchar(255) NOT NULL COMMENT '密码（加密存储）',
  is_admin tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否管理员：0-否，1-是',
  remarks varchar(255) DEFAULT NULL COMMENT '备注',
  permissions text DEFAULT NULL COMMENT '权限列表，逗号分隔',
  last_login_time datetime DEFAULT NULL COMMENT '最后登录时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username),
  KEY idx_is_admin (is_admin),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理后台用户表';
`;
// 初始化管理员账号
const initAdminUser = `
INSERT INTO waiters (username, password, is_admin, remarks, permissions)
SELECT 'admin', '$2b$10$5KuFAX.0kGI0.eJ8MZ7QH.TTYVTPwdIxFpnjTxPjcIrIdTJVRZrwO', 1, '系统管理员', '*'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM waiters WHERE username = 'admin');
`;

// 创建提现账户表
const createWithdrawalAccountsTable = `
CREATE TABLE IF NOT EXISTS withdrawal_accounts (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账户ID，主键，自增',
  member_id bigint(20) NOT NULL COMMENT '会员ID，外键关联members表',
  payment_channel_id bigint(20) DEFAULT NULL COMMENT '支付渠道ID，外键关联payment_channels表',
  account varchar(100) NOT NULL COMMENT '账号',
  name varchar(50) NOT NULL COMMENT '姓名',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_member_id (member_id),
  KEY idx_payment_channel_id (payment_channel_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现账户表';
`;

// 创建提现记录表
const createWithdrawalsTable = `
CREATE TABLE IF NOT EXISTS withdrawals (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '提现ID，主键，自增',
  bill_no varchar(64) NOT NULL COMMENT '账单编号，与bills表关联',
  member_id bigint(20) NOT NULL COMMENT '会员ID，外键关联members表',
  withdrawal_account_id bigint(20) NOT NULL COMMENT '提现账户ID，外键关联withdrawal_accounts表',
  amount decimal(10,2) NOT NULL COMMENT '申请提现金额',
  withdrawal_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '提现状态：pending-待处理，success-已完成，failed-已拒绝',
  waiter_id bigint(20) DEFAULT NULL COMMENT '审核员ID，外键关联waiters表',
  reject_reason varchar(255) DEFAULT NULL COMMENT '拒绝原因',
  remark varchar(255) DEFAULT NULL COMMENT '备注',
  process_time datetime DEFAULT NULL COMMENT '处理时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_bill_no (bill_no),
  KEY idx_member_id (member_id),
  KEY idx_withdrawal_account_id (withdrawal_account_id),
  KEY idx_withdrawal_status (withdrawal_status),
  KEY idx_waiter_id (waiter_id),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现记录表';
`;

// 创建余额变动日志表
const createBalanceLogsTable = `
CREATE TABLE IF NOT EXISTS balance_logs (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  amount decimal(10,2) NOT NULL COMMENT '变动金额',
  before_balance decimal(10,2) NOT NULL COMMENT '变动前余额',
  after_balance decimal(10,2) NOT NULL COMMENT '变动后余额',
  transaction_type varchar(100) NOT NULL COMMENT '交易类型',
  create_time datetime NOT NULL COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_member_id (member_id),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额变动日志表';
`;

// 创建通知表
const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  member_id varchar(50) NOT NULL COMMENT '会员ID，*表示所有用户',
  notification_type tinyint(1) NOT NULL COMMENT '通知类型：0-账号审核通过；1-账号审核拒绝',
  title varchar(100) NOT NULL COMMENT '通知标题',
  content text NOT NULL COMMENT '通知内容，JSON格式',
  is_read tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_member_id (member_id),
  KEY idx_notification_type (notification_type),
  KEY idx_is_read (is_read),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知表';
`;

// 创建支付渠道表
const createPaymentChannelsTable = `
CREATE TABLE IF NOT EXISTS payment_channels (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '支付渠道ID',
  name varchar(100) NOT NULL COMMENT '支付渠道名称',
  bank varchar(100) NOT NULL COMMENT '银行名称',
  merchant_id varchar(100) NOT NULL COMMENT '商户ID',
  secret_key varchar(255) NOT NULL COMMENT '密钥',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_name (name),
  KEY idx_bank (bank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付渠道表';
`;

// 创建支付交易记录表
const createPaymentTransactionsTable = `
CREATE TABLE IF NOT EXISTS payment_transactions (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '交易ID',
  order_id varchar(64) NOT NULL COMMENT '订单号',
  withdrawal_id bigint(20) NOT NULL COMMENT '关联的提现ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  payment_channel_id bigint(20) NOT NULL COMMENT '支付渠道ID',
  amount decimal(10,2) NOT NULL COMMENT '交易金额',
  account varchar(100) NOT NULL COMMENT '收款账号',
  account_name varchar(100) NOT NULL COMMENT '收款人姓名',
  transaction_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '交易状态：pending-处理中，success-成功，failed-失败',
  request_params json DEFAULT NULL COMMENT '请求参数',
  response_data json DEFAULT NULL COMMENT '响应数据',
  error_message varchar(500) DEFAULT NULL COMMENT '错误信息',
  request_time datetime DEFAULT NULL COMMENT '请求时间',
  response_time datetime DEFAULT NULL COMMENT '响应时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_order_id (order_id),
  KEY idx_withdrawal_id (withdrawal_id),
  KEY idx_member_id (member_id),
  KEY idx_payment_channel_id (payment_channel_id),
  KEY idx_transaction_status (transaction_status),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付交易记录表';
`;

// 创建任务组表
const createTaskGroupsTable = `
CREATE TABLE IF NOT EXISTS task_groups (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '任务组ID',
  task_group_name varchar(100) NOT NULL COMMENT '任务组名称',
  task_group_reward decimal(10,2) NOT NULL COMMENT '任务组奖励金额',
  related_tasks json DEFAULT NULL COMMENT '关联的任务ID列表，JSON数组格式',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_group_name (task_group_name),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务组表';
`;

// 创建任务-任务组关联表
const createTaskTaskGroupsTable = `
CREATE TABLE IF NOT EXISTS task_task_groups (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '关联ID',
  task_id bigint(20) NOT NULL COMMENT '任务ID',
  task_group_id bigint(20) NOT NULL COMMENT '任务组ID',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_id (task_id) COMMENT '确保一个任务只能属于一个任务组',
  KEY idx_task_group_id (task_group_id),
  KEY idx_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务-任务组关联表';
`;

// 创建已报名任务组表
const createEnrolledTaskGroupsTable = `
CREATE TABLE IF NOT EXISTS enrolled_task_groups (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  task_group_id bigint(20) NOT NULL COMMENT '任务组ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  enroll_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  submit_status varchar(20) NOT NULL DEFAULT 'not_submitted' COMMENT '提交状态：not_submitted-未提交，submitted-已提交',
  completion_status varchar(20) NOT NULL DEFAULT 'incomplete' COMMENT '完成状态：incomplete-未完成，completed-已完成',
  completion_time datetime DEFAULT NULL COMMENT '完成时间（发放奖励的时间）',
  reward_amount decimal(10,2) DEFAULT NULL COMMENT '实际发放的奖励金额',
  submit_task_ids json DEFAULT NULL COMMENT '已提交的任务ID列表，JSON数组格式',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_member_task_group (member_id, task_group_id),
  KEY idx_task_group_id (task_group_id),
  KEY idx_member_id (member_id),
  KEY idx_submit_status (submit_status),
  KEY idx_completion_status (completion_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已报名任务组表';
`;

// 创建位置表
const createLocationsTable = `
CREATE TABLE IF NOT EXISTS locations (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '位置ID',
  name varchar(100) NOT NULL COMMENT '位置名称',
  code varchar(50) NOT NULL COMMENT '位置代码',
  type varchar(20) NOT NULL COMMENT '位置类型',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_code (code),
  KEY idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='位置表';
`;

// 初始化位置数据
const initLocations = `
INSERT INTO locations (name, code, type) 
SELECT 'Home Banner', 'home_banner', 'ad'
FROM dual 
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE code = 'home_banner')
`;

// 创建广告表
const createAdsTable = `
CREATE TABLE IF NOT EXISTS ads (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '广告ID',
  title varchar(200) NOT NULL COMMENT '广告标题',
  location varchar(50) NOT NULL COMMENT '广告位置代码',
  start_time datetime NOT NULL COMMENT '开始时间',
  end_time datetime NOT NULL COMMENT '结束时间',
  content json DEFAULT NULL COMMENT '广告内容，JSON格式',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_location (location),
  KEY idx_start_time (start_time),
  KEY idx_end_time (end_time),
  KEY idx_title (title),
  KEY idx_create_time (create_time),
  KEY idx_update_time (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='广告表';
`;

// 执行所有SQL语句创建表
async function initTables() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始初始化数据库表...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 创建所有表
    await connection.query(createAccountsTable);
    await connection.query(createArticlesTable);
    await connection.query(createBillsTable);
    await connection.query(createChannelsTable);
    await connection.query(createGroupsTable);
    await connection.query(createMemberGroupsTable);
    await connection.query(createMembersTable);
    await connection.query(createSystemConfigTable);
    await connection.query(createTasksTable);
    await connection.query(createEnrolledTasksTable);
    await connection.query(createTaskSubmittedTable);
    await connection.query(createWaitersTable);
    await connection.query(createWithdrawalAccountsTable);
    await connection.query(createWithdrawalsTable);
    await connection.query(createBalanceLogsTable);
    await connection.query(createNotificationsTable);
    await connection.query(createOldAccountsFbTable);
    await connection.query(createMemberOldAccountsFbTable);
    await connection.query(createPaymentChannelsTable);
    await connection.query(createPaymentTransactionsTable);
    await connection.query(createTaskGroupsTable);
    await connection.query(createTaskTaskGroupsTable);
    await connection.query(createEnrolledTaskGroupsTable);
    await connection.query(createLocationsTable);
    await connection.query(createAdsTable);
    
    // 初始化管理员账号
    await connection.query(initAdminUser);
    // 初始化系统配置
    await connection.query(initSystemConfig);
    // 初始化文章
    await connection.query(initUserAgreement);
    await connection.query(initPrivacyPolicy);
    // 初始化位置数据
    await connection.query(initLocations);
    
    // 提交事务
    await connection.commit();
    
    logger.info('数据库表初始化完成');
    return true;
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`初始化数据库表失败: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

module.exports = {
  initTables
}; 