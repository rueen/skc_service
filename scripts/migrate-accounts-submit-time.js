/**
 * 迁移脚本：为 accounts 表添加 submit_time 字段
 * 并将所有现有记录的 submit_time 设置为 create_time
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateAccountsTable() {
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
    console.log('开始迁移 accounts 表...');
    
    // 检查 submit_time 字段是否已存在
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'submit_time'
    `, [process.env.DB_NAME]);
    
    // 如果 submit_time 字段不存在，添加该字段
    if (columns.length === 0) {
      console.log('正在添加 submit_time 字段...');
      await pool.query(`
        ALTER TABLE accounts 
        ADD COLUMN submit_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交/修改时间' 
        AFTER waiter_id
      `);
      console.log('submit_time 字段添加成功');
      
      // 将所有已有记录的 submit_time 设置为 create_time
      console.log('正在将所有已有记录的 submit_time 设置为 create_time...');
      await pool.query(`
        UPDATE accounts 
        SET submit_time = create_time
      `);
      console.log('所有记录的 submit_time 已更新');
    } else {
      console.log('submit_time 字段已存在，跳过迁移');
    }
    
    console.log('accounts 表迁移完成');
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    // 关闭数据库连接
    await pool.end();
  }
}

// 执行迁移
migrateAccountsTable(); 