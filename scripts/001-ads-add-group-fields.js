/**
 * 广告表添加群组字段迁移脚本
 * 为ads表添加group_mode和group_ids字段，并处理老数据
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
    console.log('开始执行ads表群组字段迁移...');
    
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'ads' 
        AND COLUMN_NAME IN ('group_mode', 'group_ids')
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // 添加group_mode字段（如果不存在）
    if (!existingColumns.includes('group_mode')) {
      console.log('添加group_mode字段...');
      await connection.query(`
        ALTER TABLE ads 
        ADD COLUMN group_mode tinyint(1) NOT NULL DEFAULT 0 
        COMMENT '群组模式：0-不指定，1-指定群组' 
        AFTER content
      `);
      
      // 添加索引
      await connection.query(`
        ALTER TABLE ads 
        ADD KEY idx_group_mode (group_mode)
      `);
      
      console.log('group_mode字段添加成功');
    } else {
      console.log('group_mode字段已存在，跳过添加');
    }
    
    // 添加group_ids字段（如果不存在）
    if (!existingColumns.includes('group_ids')) {
      console.log('添加group_ids字段...');
      await connection.query(`
        ALTER TABLE ads 
        ADD COLUMN group_ids json DEFAULT NULL 
        COMMENT '关联的群组ID列表，JSON格式' 
        AFTER group_mode
      `);
      
      console.log('group_ids字段添加成功');
    } else {
      console.log('group_ids字段已存在，跳过添加');
    }
    
    // 处理老数据：确保所有现有记录的group_mode为0，group_ids为空数组
    console.log('处理老数据...');
    const [updateResult] = await connection.query(`
      UPDATE ads 
      SET group_mode = 0, group_ids = JSON_ARRAY()
      WHERE group_mode IS NULL OR group_ids IS NULL
    `);
    
    console.log(`更新了 ${updateResult.affectedRows} 条老数据记录`);
    
    await connection.commit();
    console.log('ads表群组字段迁移完成');
    
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
