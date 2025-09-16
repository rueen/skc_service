/**
 * 会员表添加Line字段迁移脚本
 * 为members表添加line字段，并处理老数据
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
    console.log('开始执行members表Line字段迁移...');
    
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'line'
    `);
    
    if (columns.length > 0) {
      console.log('line字段已存在，跳过添加');
      await connection.commit();
      return true;
    }
    
    // 添加line字段
    console.log('添加line字段...');
    await connection.query(`
      ALTER TABLE members 
      ADD COLUMN line varchar(50) DEFAULT NULL 
      COMMENT 'Line账号' 
      AFTER telegram
    `);
    
    console.log('line字段添加成功');
    
    // 处理老数据：确保所有现有记录的line字段为NULL（默认值）
    console.log('处理老数据...');
    const [updateResult] = await connection.query(`
      UPDATE members 
      SET line = NULL
      WHERE line IS NULL
    `);
    
    console.log(`更新了 ${updateResult.affectedRows} 条老数据记录`);
    
    await connection.commit();
    console.log('members表Line字段迁移完成');
    
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
