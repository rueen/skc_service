/*
 * @Author: claude
 * @Date: 2025-05-15 10:00:00
 * @Description: 为waiters表添加password_changed_time字段
 */

/**
 * 迁移脚本：为waiters表添加password_changed_time字段
 * 执行后，小二可以在修改密码后要求重新登录
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../src/shared/config/logger.config');

// 创建数据库连接
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
};

async function run() {
  let connection;
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('检查waiters表是否存在password_changed_time字段...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'waiters' AND COLUMN_NAME = 'password_changed_time'
    `, [process.env.DB_NAME]);
    
    if (columns.length > 0) {
      console.log('password_changed_time字段已存在，无需添加');
      return;
    }
    
    console.log('为waiters表添加password_changed_time字段...');
    await connection.query(`
      ALTER TABLE waiters 
      ADD COLUMN password_changed_time datetime DEFAULT NULL COMMENT '密码最后修改时间' 
      AFTER permissions
    `);
    
    console.log('字段添加成功');
    
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      console.log('关闭数据库连接');
      await connection.end();
    }
  }
}

// 执行迁移
run().catch(err => {
  console.error('迁移脚本执行错误:', err);
  process.exit(1);
}); 