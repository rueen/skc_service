/**
 * 迁移脚本：为 accounts 表添加驳回次数字段
 * @Author: assistant
 * @Date: 2025-01-11
 * @Description: 添加 reject_times 字段到 accounts 表
 */

// 尝试加载环境变量
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
    logger.info('开始执行迁移：添加驳回次数字段到 accounts 表');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'accounts' 
      AND COLUMN_NAME = 'reject_times'
    `);
    
    if (columns.length === 0) {
      // 添加 reject_times 字段
      await connection.query(`
        ALTER TABLE accounts 
        ADD COLUMN reject_times int(11) NOT NULL DEFAULT 0 COMMENT '驳回次数' 
        AFTER reject_reason
      `);
      logger.info('成功添加 reject_times 字段');
      
      // 为现有数据设置默认值 0（实际上 DEFAULT 0 已经处理了）
      logger.info('现有数据的 reject_times 字段已自动设置为默认值 0');
    } else {
      logger.info('reject_times 字段已存在，跳过添加');
    }
    
    // 提交事务
    await connection.commit();
    
    logger.info('迁移执行完成：驳回次数字段已添加到 accounts 表');
    return true;
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`迁移执行失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
async function run() {
  try {
    await migrate();
    console.log('✅ 迁移脚本执行成功');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移脚本执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行迁移
if (require.main === module) {
  run();
}

module.exports = { migrate }; 