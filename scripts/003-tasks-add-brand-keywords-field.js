/**
 * 任务表添加品牌关键词字段迁移脚本
 * 为tasks表添加brand_keywords字段，无需处理老数据
 * 
 * ⚠️  重要提醒：
 * 1. 此脚本会对tasks表加排他锁，可能导致业务接口503错误
 * 2. 建议在低峰期或维护窗口期执行
 * 3. 大表（>10万记录）建议启用维护模式
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
    console.log('开始执行tasks表品牌关键词字段迁移...');
    
    // 检查表记录数量，评估迁移风险
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM tasks');
    const recordCount = countResult[0].count;
    console.log(`当前tasks表记录数：${recordCount}`);
    
    if (recordCount > 100000) {
      console.warn('⚠️  警告：表记录数超过10万，建议在维护模式下执行此迁移！');
      console.warn('    ALTER TABLE操作可能需要数分钟，会阻塞所有业务请求！');
    }
    
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'tasks' 
        AND COLUMN_NAME = 'brand_keywords'
    `);
    
    if (columns.length > 0) {
      console.log('brand_keywords字段已存在，跳过添加');
      await connection.commit();
      return true;
    }
    
    // 添加brand_keywords字段
    console.log('添加brand_keywords字段...');
    await connection.query(`
      ALTER TABLE tasks 
      ADD COLUMN brand_keywords json DEFAULT NULL 
      COMMENT '品牌关键词，JSON格式存储对象数组[{text, ratio}]' 
      AFTER brand
    `);
    
    console.log('brand_keywords字段添加成功');
    
    // 新字段默认值为NULL，老数据无需处理
    console.log('新字段默认值为NULL，老数据无需处理');
    
    await connection.commit();
    console.log('tasks表品牌关键词字段迁移完成');
    
    return true;
  } catch (error) {
    await connection.rollback();
    console.error(`迁移失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
migrate()
  .then(() => {
    console.log('迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
