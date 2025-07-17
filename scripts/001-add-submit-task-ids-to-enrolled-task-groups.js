/*
 * @Author: diaochan
 * @Date: 2025-07-17 17:10:07
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-17 17:16:31
 * @Description: 
 */
/**
 * 迁移脚本：为 enrolled_task_groups 表添加 submit_task_ids 字段
 * 创建时间：2025-07-17
 * 描述：为已报名任务组表添加已提交的任务ID列表字段
 */
// 加载环境变量
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
    console.log('开始执行迁移：为 enrolled_task_groups 表添加 submit_task_ids 字段...');
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'enrolled_task_groups' 
        AND COLUMN_NAME = 'submit_task_ids'
    `);
    
    if (columns.length > 0) {
      console.log('字段 submit_task_ids 已存在，跳过迁移');
      return;
    }
    
    // 添加新字段
    await connection.query(`
      ALTER TABLE enrolled_task_groups 
      ADD COLUMN submit_task_ids json DEFAULT NULL COMMENT '已提交的任务ID列表，JSON数组格式'
      AFTER reward_amount
    `);
    
    // 为现有数据设置默认值（空数组）
    await connection.query(`
      UPDATE enrolled_task_groups 
      SET submit_task_ids = JSON_ARRAY() 
      WHERE submit_task_ids IS NULL
    `);
    
    console.log('迁移成功：已为 enrolled_task_groups 表添加 submit_task_ids 字段');
    
  } catch (error) {
    console.error(`迁移失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
migrate()
  .then(() => {
    console.log('迁移脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  }); 