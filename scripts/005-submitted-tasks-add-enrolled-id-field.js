/**
 * 为 submitted_tasks 表新增 enrolled_id 字段
 * 迁移脚本 005
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
    console.log('开始执行迁移脚本 005...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'submitted_tasks' 
        AND COLUMN_NAME = 'enrolled_id'
    `);
    
    if (columns.length > 0) {
      console.log('字段 enrolled_id 已存在，跳过此次迁移');
      await connection.commit();
      return true;
    }
    
    // 为 submitted_tasks 表新增 enrolled_id 字段
    console.log('添加 enrolled_id 字段...');
    await connection.query(`
      ALTER TABLE submitted_tasks 
      ADD COLUMN enrolled_id bigint(20) DEFAULT NULL COMMENT '关联的报名ID'
      AFTER member_id
    `);
    
    // 添加索引
    console.log('添加 enrolled_id 索引...');
    await connection.query(`
      ALTER TABLE submitted_tasks 
      ADD KEY idx_enrolled_id (enrolled_id)
    `);
    
    // 添加外键约束
    console.log('添加外键约束...');
    await connection.query(`
      ALTER TABLE submitted_tasks 
      ADD CONSTRAINT fk_submitted_tasks_enrolled_id 
      FOREIGN KEY (enrolled_id) REFERENCES enrolled_tasks(id) 
      ON DELETE SET NULL
    `);
    
    console.log('已为 submitted_tasks 表新增 enrolled_id 字段、索引和外键约束');
    
    // 提交事务
    await connection.commit();
    console.log('迁移脚本 005 执行成功');
    
    return true;
  } catch (error) {
    await connection.rollback();
    console.error(`迁移脚本 005 执行失败: ${error.message}`);
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
