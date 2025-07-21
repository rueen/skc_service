/*
 * @Author: diaochan
 * @Date: 2025-07-21 15:49:32
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-21 15:52:20
 * @Description: 
 */
/**
 * 数据库迁移：修复小二表permissions字段长度问题
 * 将permissions字段从varchar(255)扩展为text类型
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
    
    logger.info('开始修复permissions字段长度...');
    
    // 检查当前字段类型
    const [columns] = await connection.query(`
      SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'waiters' 
      AND COLUMN_NAME = 'permissions'
    `);
    
    if (columns.length === 0) {
      logger.error('未找到permissions字段');
      return;
    }
    
    const currentType = columns[0].COLUMN_TYPE;
    logger.info(`当前permissions字段类型: ${currentType}`);
    
    // 如果已经是text类型，跳过迁移
    if (currentType.toLowerCase().includes('text')) {
      logger.info('permissions字段已经是text类型，跳过迁移');
      return;
    }
    
    // 执行字段类型修改
    await connection.query(`
      ALTER TABLE waiters 
      MODIFY COLUMN permissions TEXT COMMENT '权限列表，逗号分隔'
    `);
    
    // 验证修改结果
    const [newColumns] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'waiters' 
      AND COLUMN_NAME = 'permissions'
    `);
    
    logger.info(`修改后permissions字段类型: ${newColumns[0].COLUMN_TYPE}`);
    
    await connection.commit();
    logger.info('permissions字段长度修复完成');
    
  } catch (error) {
    await connection.rollback();
    logger.error(`修复permissions字段失败: ${error.message}`);
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