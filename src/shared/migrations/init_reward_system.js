/**
 * 初始化奖励系统
 * 初始化bills表和必要的会员余额字段
 * 执行方法: node src/shared/migrations/init_reward_system.js
 */
const { pool } = require('../models/db');
const logger = require('../config/logger.config');
const memberBalanceModel = require('../models/member-balance.model');

/**
 * 创建bills表
 * @returns {Promise<boolean>} 操作结果
 */
async function createBillsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查表是否存在
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bills'",
      [process.env.DB_DATABASE]
    );
    
    // 如果表存在，删除它
    if (tables.length > 0) {
      logger.info('bills表已存在，将进行删除后重新创建');
      await connection.execute('DROP TABLE IF EXISTS bills');
    }
    
    // 创建bills表
    logger.info('开始创建bills表...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '账单ID',
        member_id bigint(20) NOT NULL COMMENT '会员ID',
        bill_type varchar(20) NOT NULL COMMENT '账单类型：withdrawal-提现，task_reward-任务奖励，invite_reward-邀请奖励，group_owner_commission-群主收益',
        amount decimal(10,2) NOT NULL COMMENT '金额',
        settlement_status varchar(20) NOT NULL DEFAULT 'pending' COMMENT 'success-结算成功，failed-结算失败，pending-等待结算',
        task_id bigint(20) DEFAULT NULL COMMENT '关联的任务ID',
        related_member_id bigint(20) DEFAULT NULL COMMENT '关联的会员ID',
        failure_reason varchar(255) DEFAULT NULL COMMENT '结算失败原因',
        create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        KEY idx_member_id (member_id),
        KEY idx_bill_type (bill_type),
        KEY idx_settlement_status (settlement_status),
        KEY idx_task_id (task_id),
        KEY idx_related_member_id (related_member_id),
        KEY idx_create_time (create_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='账单表';
    `);
    
    await connection.commit();
    logger.info('bills表创建成功');
    
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`创建bills表失败: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * 检查和设置系统配置
 * @returns {Promise<boolean>} 操作结果
 */
async function checkAndSetSystemConfig() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查群主收益率配置是否存在
    const [groupOwnerConfig] = await connection.query(
      "SELECT config_key FROM system_config WHERE config_key = 'group_owner_commission_rate'"
    );
    
    // 检查邀请奖励金额配置是否存在
    const [inviteRewardConfig] = await connection.query(
      "SELECT config_key FROM system_config WHERE config_key = 'invite_reward_amount'"
    );
    
    // 如果配置不存在，添加它们
    if (groupOwnerConfig.length === 0) {
      logger.info('群主收益率配置不存在，将添加默认值');
      await connection.query(
        "INSERT INTO system_config (config_key, config_value, description) VALUES ('group_owner_commission_rate', '0.1', '群主收益率（0-1之间的小数）')"
      );
    }
    
    if (inviteRewardConfig.length === 0) {
      logger.info('邀请奖励金额配置不存在，将添加默认值');
      await connection.query(
        "INSERT INTO system_config (config_key, config_value, description) VALUES ('invite_reward_amount', '5.00', '邀请奖励金额（元）')"
      );
    }
    
    await connection.commit();
    logger.info('系统配置检查和设置完成');
    
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`检查和设置系统配置失败: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * 初始化奖励系统
 * @returns {Promise<boolean>} 操作结果
 */
async function initRewardSystem() {
  try {
    logger.info('开始初始化奖励系统...');
    
    // 1. 创建bills表
    logger.info('步骤1: 创建bills表');
    await createBillsTable();
    
    // 2. 初始化会员余额字段和日志表
    logger.info('步骤2: 初始化会员余额字段和日志表');
    await memberBalanceModel.init();
    
    // 3. 检查和设置系统配置
    logger.info('步骤3: 检查和设置系统配置');
    await checkAndSetSystemConfig();
    
    logger.info('奖励系统初始化完成');
    return true;
  } catch (error) {
    logger.error(`奖励系统初始化失败: ${error.message}`);
    return false;
  }
}

// 执行初始化
initRewardSystem()
  .then(result => {
    if (result) {
      logger.info('奖励系统初始化成功');
    } else {
      logger.error('奖励系统初始化失败');
    }
    process.exit(0);
  })
  .catch(error => {
    logger.error(`奖励系统初始化出错: ${error.message}`);
    process.exit(1);
  }); 