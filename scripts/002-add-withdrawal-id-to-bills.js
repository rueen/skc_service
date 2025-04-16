/**
 * 迁移脚本：为 bills 表添加 withdrawal_id 字段
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateBillsTable() {
  // 创建数据库连接
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('开始迁移 bills 表，添加 withdrawal_id 字段...');
    
    // 检查 withdrawal_id 字段是否已存在
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bills' AND COLUMN_NAME = 'withdrawal_id'
    `, [process.env.DB_NAME]);
    
    // 如果 withdrawal_id 字段不存在，添加该字段
    if (columns.length === 0) {
      console.log('正在添加 withdrawal_id 字段...');
      
      // 添加 withdrawal_id 字段
      await pool.query(`
        ALTER TABLE bills 
        ADD COLUMN withdrawal_id bigint(20) DEFAULT NULL COMMENT '关联的提现ID' 
        AFTER task_id
      `);
      
      // 添加索引
      await pool.query(`
        ALTER TABLE bills 
        ADD INDEX idx_withdrawal_id (withdrawal_id)
      `);
      
      console.log('withdrawal_id 字段和索引添加成功');
    } else {
      console.log('withdrawal_id 字段已存在，跳过迁移');
    }
    
    console.log('bills 表迁移完成');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
  }
}

// 执行迁移
migrateBillsTable(); 