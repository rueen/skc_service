/**
 * 数据库迁移脚本：为withdrawals表添加提现相关字段并迁移历史数据
 * 添加字段：withdrawal_name, withdrawal_account, withdrawal_payment_channel_id
 * 从withdrawal_accounts表迁移相关数据到withdrawals表的新字段
 */
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { pool } = require('../src/shared/models/db');
const { logger } = require('../src/shared/config/logger.config');

async function migrate() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    logger.info('开始执行withdrawals表字段迁移...');
    
    // 1. 检查新字段是否已存在
    const [existingFields] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'withdrawals' 
        AND COLUMN_NAME IN ('withdrawal_name', 'withdrawal_account', 'withdrawal_payment_channel_id')
    `);
    
    const existingFieldNames = existingFields.map(field => field.COLUMN_NAME);
    
    // 2. 添加不存在的字段
    if (!existingFieldNames.includes('withdrawal_name')) {
      logger.info('添加withdrawal_name字段到withdrawals表...');
      await connection.query(`
        ALTER TABLE withdrawals 
        ADD COLUMN withdrawal_name varchar(50) DEFAULT NULL COMMENT '提现姓名'
        AFTER withdrawal_account_id
      `);
    } else {
      logger.info('withdrawal_name字段已存在，跳过添加');
    }
    
    if (!existingFieldNames.includes('withdrawal_account')) {
      logger.info('添加withdrawal_account字段到withdrawals表...');
      await connection.query(`
        ALTER TABLE withdrawals 
        ADD COLUMN withdrawal_account varchar(100) DEFAULT NULL COMMENT '提现账号'
        AFTER withdrawal_name
      `);
    } else {
      logger.info('withdrawal_account字段已存在，跳过添加');
    }
    
    if (!existingFieldNames.includes('withdrawal_payment_channel_id')) {
      logger.info('添加withdrawal_payment_channel_id字段到withdrawals表...');
      await connection.query(`
        ALTER TABLE withdrawals 
        ADD COLUMN withdrawal_payment_channel_id bigint(20) DEFAULT NULL COMMENT '提现支付渠道ID'
        AFTER withdrawal_account
      `);
      
      // 为新字段添加索引
      logger.info('为withdrawal_payment_channel_id字段添加索引...');
      await connection.query(`
        ALTER TABLE withdrawals 
        ADD INDEX idx_withdrawal_payment_channel_id (withdrawal_payment_channel_id)
      `);
    } else {
      logger.info('withdrawal_payment_channel_id字段已存在，跳过添加');
    }
    
    // 3. 查询需要迁移的数据
    logger.info('开始迁移历史数据...');
    const [withdrawalRecords] = await connection.query(`
      SELECT 
        w.id,
        w.withdrawal_account_id,
        wa.name as account_name,
        wa.account as account_number,
        wa.payment_channel_id
      FROM withdrawals w
      INNER JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
      WHERE (w.withdrawal_name IS NULL OR w.withdrawal_account IS NULL OR w.withdrawal_payment_channel_id IS NULL)
    `);
    
    if (withdrawalRecords.length === 0) {
      logger.info('没有需要迁移的历史数据');
    } else {
      logger.info(`找到 ${withdrawalRecords.length} 条记录需要迁移数据`);
      
      // 4. 批量更新数据
      let updatedCount = 0;
      for (const record of withdrawalRecords) {
        await connection.query(`
          UPDATE withdrawals 
          SET 
            withdrawal_name = ?,
            withdrawal_account = ?,
            withdrawal_payment_channel_id = ?
          WHERE id = ?
        `, [
          record.account_name,
          record.account_number,
          record.payment_channel_id,
          record.id
        ]);
        updatedCount++;
      }
      
      logger.info(`成功迁移了 ${updatedCount} 条提现记录的数据`);
    }
    
    // 5. 查询迁移后的统计信息
    const [totalWithdrawals] = await connection.query('SELECT COUNT(*) as total FROM withdrawals');
    const [migratedWithdrawals] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM withdrawals 
      WHERE withdrawal_name IS NOT NULL 
        AND withdrawal_account IS NOT NULL 
        AND withdrawal_payment_channel_id IS NOT NULL
    `);
    const [pendingWithdrawals] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM withdrawals 
      WHERE withdrawal_name IS NULL 
        OR withdrawal_account IS NULL 
        OR withdrawal_payment_channel_id IS NULL
    `);
    
    logger.info(`迁移完成统计：`);
    logger.info(`- 总提现记录数: ${totalWithdrawals[0].total}`);
    logger.info(`- 已迁移数据记录数: ${migratedWithdrawals[0].count}`);
    logger.info(`- 待迁移数据记录数: ${pendingWithdrawals[0].count}`);
    
    // 提交事务
    await connection.commit();
    logger.info('withdrawals表字段迁移完成!');
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`迁移失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`迁移失败: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { migrate };