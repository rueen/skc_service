/**
 * 为 enrolled_tasks 表新增 brand_keywords 字段
 * 迁移脚本 004
 */
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { pool } = require('../src/shared/models/db');
const { logger } = require('../src/shared/config/logger.config');

/**
 * 执行迁移
 */
async function runMigration() {
  const connection = await pool.getConnection();
  try {
    console.log('开始执行迁移脚本 004...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'enrolled_tasks' 
        AND COLUMN_NAME = 'brand_keywords'
    `);
    
    if (columns.length > 0) {
      console.log('字段 brand_keywords 已存在，跳过此次迁移');
      await connection.commit();
      return true;
    }
    
    // 为 enrolled_tasks 表新增 brand_keywords 字段
    console.log('添加 brand_keywords 字段...');
    await connection.query(`
      ALTER TABLE enrolled_tasks 
      ADD COLUMN brand_keywords varchar(255) DEFAULT NULL COMMENT '品牌关键词'
      AFTER related_group_id
    `);
    
    console.log('已为 enrolled_tasks 表新增 brand_keywords 字段');
    
    // 提交事务
    await connection.commit();
    console.log('迁移脚本 004 执行成功');
    
    return true;
  } catch (error) {
    await connection.rollback();
    console.error(`迁移脚本 004 执行失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
