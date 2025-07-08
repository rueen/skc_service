/*
 * @Author: diaochan
 * @Date: 2025-07-08 10:13:40
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-08 10:16:26
 * @Description: 
 */
/**
 * 迁移脚本：为 submitted_tasks 表添加审核时间字段
 * @Author: assistant
 * @Date: 2025-01-11
 * @Description: 添加 pre_audit_time 和 audit_time 字段到 submitted_tasks 表
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
    logger.info('开始执行迁移：添加审核时间字段到 submitted_tasks 表');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'submitted_tasks' 
      AND COLUMN_NAME IN ('pre_audit_time', 'audit_time')
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // 添加 pre_audit_time 字段（如果不存在）
    if (!existingColumns.includes('pre_audit_time')) {
      await connection.query(`
        ALTER TABLE submitted_tasks 
        ADD COLUMN pre_audit_time datetime DEFAULT NULL COMMENT '预审时间' 
        AFTER pre_waiter_id
      `);
      logger.info('成功添加 pre_audit_time 字段');
    } else {
      logger.info('pre_audit_time 字段已存在，跳过添加');
    }
    
    // 添加 audit_time 字段（如果不存在）
    if (!existingColumns.includes('audit_time')) {
      await connection.query(`
        ALTER TABLE submitted_tasks 
        ADD COLUMN audit_time datetime DEFAULT NULL COMMENT '审核时间' 
        AFTER waiter_id
      `);
      logger.info('成功添加 audit_time 字段');
    } else {
      logger.info('audit_time 字段已存在，跳过添加');
    }
    
    // 提交事务
    await connection.commit();
    
    logger.info('迁移执行完成：审核时间字段已添加到 submitted_tasks 表');
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