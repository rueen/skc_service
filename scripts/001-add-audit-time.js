/**
 * 迁移脚本：为 accounts 表添加 audit_time 字段
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateAuditTime() {
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
    console.log('开始迁移 accounts 表，添加 audit_time 字段...');
    
    // 检查 audit_time 字段是否已存在
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'audit_time'
    `, [process.env.DB_NAME]);
    
    // 如果 audit_time 字段不存在，添加该字段
    if (columns.length === 0) {
      console.log('正在添加 audit_time 字段...');
      await pool.query(`
        ALTER TABLE accounts 
        ADD COLUMN audit_time datetime DEFAULT NULL COMMENT '审核时间' 
        AFTER waiter_id
      `);
      console.log('audit_time 字段添加成功，初始值为 NULL');
      
      // 为已审核的账号设置审核时间（可选，此处设为 NULL）
      console.log('所有现有记录的 audit_time 已设置为 NULL');
    } else {
      console.log('audit_time 字段已存在，跳过迁移');
    }
    
    console.log('accounts 表迁移完成');
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await pool.end();
  }
}

// 执行迁移
migrateAuditTime(); 