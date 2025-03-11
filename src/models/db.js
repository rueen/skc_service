/**
 * 数据库连接模块
 * 创建MySQL连接池并导出
 */
const mysql = require('mysql2/promise');
const dbConfig = require('../config/db.config');
const logger = require('../config/logger.config');

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    logger.error(`数据库连接失败: ${error.message}`);
    return false;
  }
}

// 初始化数据库
async function initDatabase() {
  try {
    // 检查数据库是否存在，如果不存在则创建
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    logger.info(`确保数据库 ${dbConfig.database} 存在`);
    
    // 切换到指定数据库
    await connection.query(`USE ${dbConfig.database}`);
    
    // 在这里可以添加创建表的逻辑
    // ...
    
    await connection.end();
    
    return true;
  } catch (error) {
    logger.error(`初始化数据库失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  initDatabase
}; 