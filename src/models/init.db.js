/**
 * 数据库初始化脚本
 * 创建所有必要的数据库表
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

// 创建任务表
const createTasksTable = `
CREATE TABLE IF NOT EXISTS tasks (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  task_name varchar(100) NOT NULL COMMENT '任务名称',
  channel_id bigint(20) NOT NULL COMMENT '渠道ID',
  category varchar(50) NOT NULL COMMENT '任务类别',
  task_type varchar(20) NOT NULL COMMENT '任务类型：image_text-图文任务，video-视频任务',
  reward decimal(10,2) NOT NULL COMMENT '任务奖励金额',
  brand varchar(100) NOT NULL COMMENT '品牌名称',
  group_ids json DEFAULT NULL COMMENT '群组ID列表',
  group_mode tinyint(1) NOT NULL DEFAULT '0' COMMENT '群组模式',
  user_range tinyint(1) NOT NULL DEFAULT '1' COMMENT '用户范围',
  task_count int(11) NOT NULL DEFAULT '0' COMMENT '任务数量',
  custom_fields json NOT NULL COMMENT '自定义字段',
  start_time datetime NOT NULL COMMENT '开始时间',
  end_time datetime NOT NULL COMMENT '结束时间',
  unlimited_quota tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否不限名额',
  fans_required varchar(50) DEFAULT NULL COMMENT '粉丝要求',
  content_requirement text COMMENT '内容要求',
  task_info text COMMENT '任务说明',
  notice text COMMENT '温馨提示',
  task_status varchar(20) NOT NULL DEFAULT 'not_started' COMMENT '任务状态：not_started-未开始，processing-进行中，ended-已结束',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_channel_id (channel_id),
  KEY idx_task_status (task_status),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务表';
`;

// 创建已提交任务表
const createTaskSubmittedTable = `
CREATE TABLE IF NOT EXISTS task_submitted (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '提交ID',
  task_id bigint(20) NOT NULL COMMENT '关联任务ID',
  member_id bigint(20) NOT NULL COMMENT '关联会员ID',
  task_audit_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending-待审核，approved-已通过，rejected-已拒绝',
  apply_time datetime DEFAULT NULL COMMENT '报名时间',
  submit_time datetime DEFAULT NULL COMMENT '提交时间',
  reject_reason varchar(255) DEFAULT NULL COMMENT '拒绝原因',
  submit_content json DEFAULT NULL COMMENT '提交内容',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_task_id (task_id),
  KEY idx_member_id (member_id),
  KEY idx_task_audit_status (task_audit_status),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='已提交任务表';
`;

// 创建账号表
const createAccountsTable = `
CREATE TABLE IF NOT EXISTS accounts (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账号ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  channel_id bigint(20) NOT NULL COMMENT '渠道ID',
  account varchar(100) NOT NULL COMMENT '账号名称',
  home_url varchar(255) DEFAULT NULL COMMENT '主页链接',
  fans_count int(11) DEFAULT '0' COMMENT '粉丝数量',
  friends_count int(11) DEFAULT '0' COMMENT '好友数量',
  posts_count int(11) DEFAULT '0' COMMENT '发布数量',
  account_audit_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态：pending-待审核，approved-已通过，rejected-已拒绝',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_member_id (member_id),
  KEY idx_channel_id (channel_id),
  KEY idx_account_audit_status (account_audit_status),
  UNIQUE KEY uk_member_channel_account (member_id,channel_id,account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账号表';
`;

// 创建会员表
const createMembersTable = `
CREATE TABLE IF NOT EXISTS members (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '会员ID',
  member_nickname varchar(50) NOT NULL COMMENT '会员昵称',
  member_account varchar(50) NOT NULL COMMENT '会员账号',
  group_id bigint(20) DEFAULT NULL COMMENT '所属群组ID',
  inviter_id bigint(20) DEFAULT NULL COMMENT '邀请人ID',
  occupation varchar(20) DEFAULT NULL COMMENT '职业：housewife-宝妈，freelancer-自由职业，student-学生',
  is_group_owner tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否是群主：0-否，1-是',
  invite_code varchar(20) DEFAULT NULL COMMENT '邀请码',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_group_id (group_id),
  KEY idx_inviter_id (inviter_id),
  UNIQUE KEY uk_member_account (member_account),
  UNIQUE KEY uk_invite_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员表';
`;

// 创建渠道表
const createChannelsTable = `
CREATE TABLE IF NOT EXISTS channels (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '渠道ID',
  name varchar(50) NOT NULL COMMENT '渠道名称',
  icon varchar(255) DEFAULT NULL COMMENT '渠道图标',
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
  member_count int(11) NOT NULL DEFAULT '0' COMMENT '成员数量',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_owner_id (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='群组表';
`;

// 创建提现表
const createWithdrawalsTable = `
CREATE TABLE IF NOT EXISTS withdrawals (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '提现ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  withdrawal_account varchar(100) NOT NULL COMMENT '提现账号',
  withdrawal_account_type varchar(20) NOT NULL COMMENT '提现账号类型：bank-银行卡，alipay-支付宝，wechat-微信',
  amount decimal(10,2) NOT NULL COMMENT '提现金额',
  real_name varchar(50) NOT NULL COMMENT '真实姓名',
  withdrawal_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT '提现状态：pending-待处理，success-提现成功，failed-提现失败',
  apply_time datetime NOT NULL COMMENT '申请时间',
  process_time datetime DEFAULT NULL COMMENT '处理时间',
  remark varchar(255) DEFAULT NULL COMMENT '备注',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_member_id (member_id),
  KEY idx_withdrawal_status (withdrawal_status),
  KEY idx_apply_time (apply_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提现表';
`;

// 创建账单表
const createBillsTable = `
CREATE TABLE IF NOT EXISTS bills (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账单ID',
  member_id bigint(20) NOT NULL COMMENT '会员ID',
  bill_type varchar(20) NOT NULL COMMENT '账单类型：withdrawal-提现，task_income-任务收入，invite_reward-邀请奖励，group_reward-群主奖励',
  amount decimal(10,2) NOT NULL COMMENT '金额',
  related_id bigint(20) DEFAULT NULL COMMENT '关联ID',
  settlement_status varchar(20) NOT NULL DEFAULT 'settled' COMMENT '结算状态：settled-已结算，failed-结算失败',
  remark varchar(255) DEFAULT NULL COMMENT '备注',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  KEY idx_member_id (member_id),
  KEY idx_bill_type (bill_type),
  KEY idx_settlement_status (settlement_status),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账单表';
`;

// 创建小二表
const createWaitersTable = `
CREATE TABLE IF NOT EXISTS waiters (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '小二ID',
  username varchar(50) NOT NULL COMMENT '用户名',
  password varchar(255) NOT NULL COMMENT '密码（bcrypt加密）',
  is_admin tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否管理员：0-否，1-是',
  remarks varchar(255) DEFAULT NULL COMMENT '备注',
  permissions text DEFAULT NULL COMMENT '权限列表，逗号分隔',
  last_login_time datetime DEFAULT NULL COMMENT '最后登录时间',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小二表';
`;

// 创建文章表
const createArticlesTable = `
CREATE TABLE IF NOT EXISTS articles (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '文章ID',
  title varchar(100) NOT NULL COMMENT '文章标题',
  content text NOT NULL COMMENT '文章内容',
  location varchar(50) NOT NULL COMMENT '文章位置标识',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';
`;

// 初始化管理员账号
const initAdminUser = `
INSERT INTO waiters (username, password, is_admin, remarks)
SELECT 'admin', '$2b$10$rKN3RmZ0J2CvQIAJzILYpODM.CZxsRqgAJRNkwQwQMpLQzJaKjiHK', 1, '系统管理员'
FROM dual
WHERE NOT EXISTS (SELECT 1 FROM waiters WHERE username = 'admin');
`;

// 执行所有SQL语句创建表
async function initTables() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始初始化数据库表...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 创建所有表
    await connection.query(createTasksTable);
    await connection.query(createTaskSubmittedTable);
    await connection.query(createAccountsTable);
    await connection.query(createMembersTable);
    await connection.query(createChannelsTable);
    await connection.query(createGroupsTable);
    await connection.query(createWithdrawalsTable);
    await connection.query(createBillsTable);
    await connection.query(createWaitersTable);
    await connection.query(createArticlesTable);
    
    // 初始化管理员账号 (密码: admin123)
    await connection.query(initAdminUser);
    
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