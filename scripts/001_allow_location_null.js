/*
 * @Author: diaochan
 * @Date: 2025-04-17 17:45:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 17:45:00
 * @Description: 修改articles表的location字段允许为NULL
 */
/**
 * 修改articles表的location字段允许为NULL的迁移脚本
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../src/shared/config/logger.config');

async function allowLocationNull() {
  console.log('开始执行迁移：修改 articles 表 location 字段允许为 NULL');

  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  try {
    // 开始事务
    await connection.beginTransaction();

    // 修改 location 字段，允许为 NULL
    console.log('修改 location 字段，允许为 NULL...');
    await connection.query(`
      ALTER TABLE articles
      MODIFY COLUMN location varchar(50) NULL DEFAULT NULL COMMENT '文章位置标识，可为空';
    `);

    // 提交事务
    await connection.commit();
    console.log('迁移成功：articles 表的 location 字段已修改为允许 NULL 值');

  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error('迁移失败：', error.message);
    process.exit(1);
  } finally {
    // 关闭连接
    await connection.end();
  }
}

// 执行迁移
allowLocationNull().catch(error => {
  console.error('执行迁移时发生错误：', error);
  process.exit(1);
}); 