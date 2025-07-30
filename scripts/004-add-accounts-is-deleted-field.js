/**
 * 数据库迁移脚本：为accounts表添加is_deleted字段并处理历史数据
 * 为现有账号数据设置默认值 is_deleted = 0（未删除）
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
    
    logger.info('开始执行账号is_deleted字段迁移...');
    
    // 1. 首先检查is_deleted字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'is_deleted'
    `);
    
    if (columns.length === 0) {
      // 2. 添加is_deleted字段（如果不存在）
      logger.info('添加is_deleted字段到accounts表...');
      await connection.query(`
        ALTER TABLE accounts 
        ADD COLUMN is_deleted tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否已删除：0-未删除，1-已删除'
        AFTER is_new
      `);
      
      // 3. 添加索引
      logger.info('为is_deleted字段添加索引...');
      await connection.query(`
        ALTER TABLE accounts 
        ADD INDEX idx_is_deleted (is_deleted)
      `);
    } else {
      logger.info(`is_deleted字段已存在，当前类型: ${columns[0].COLUMN_TYPE}，跳过字段添加步骤`);
    }
    
    // 4. 确保所有现有账号的is_deleted都设置为0（未删除）
    logger.info('更新历史数据：确保所有现有账号is_deleted为0...');
    const [updateResult] = await connection.query(`
      UPDATE accounts 
      SET is_deleted = 0 
      WHERE is_deleted IS NULL OR is_deleted != 0
    `);
    
    if (updateResult.affectedRows > 0) {
      logger.info(`成功更新了 ${updateResult.affectedRows} 个账号的is_deleted状态为未删除`);
    } else {
      logger.info('所有账号的is_deleted状态已正确设置');
    }
    
    // 5. 查询统计信息
    const [totalAccounts] = await connection.query('SELECT COUNT(*) as total FROM accounts');
    const [activeAccounts] = await connection.query('SELECT COUNT(*) as count FROM accounts WHERE is_deleted = 0');
    const [deletedAccounts] = await connection.query('SELECT COUNT(*) as count FROM accounts WHERE is_deleted = 1');
    
    logger.info(`迁移完成统计：`);
    logger.info(`- 总账号数: ${totalAccounts[0].total}`);
    logger.info(`- 未删除账号数: ${activeAccounts[0].count}`);
    logger.info(`- 已删除账号数: ${deletedAccounts[0].count}`);
    
    // 提交事务
    await connection.commit();
    logger.info('账号is_deleted字段迁移完成!');
    
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