/**
 * 创建bills表的迁移脚本
 * 执行方法: node src/shared/migrations/create_bills_table.js
 */
const { pool } = require('../models/db');
const logger = require('../config/logger.config');

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
        bill_type varchar(50) NOT NULL COMMENT '账单类型：withdrawal-提现，task_reward-任务奖励，invite_reward-邀请奖励，group_owner_commission-群主收益',
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

// 执行迁移
createBillsTable()
  .then(() => {
    logger.info('迁移脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`迁移脚本执行失败: ${error.message}`);
    process.exit(1);
  }); 