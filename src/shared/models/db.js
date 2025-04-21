/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:09:55
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-10 11:22:29
 * @Description: 
 */
/**
 * 数据库连接模块
 * 创建MySQL连接池并导出
 */
const mysql = require('mysql2/promise');
const logger = require('../config/logger.config');

// 获取数据库配置
function getDbConfig() {
  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_LIMIT, 10),
    queueLimit: 0
  };
}

// 创建管理后台连接池
const adminPool = mysql.createPool(getDbConfig());

// 创建H5端连接池
const h5Pool = mysql.createPool(getDbConfig());

// 根据应用类型获取连接池
function getPool() {
  // 根据环境变量判断当前应用类型
  const isH5 = process.env.BASE_URL === '/api/h5';
  return isH5 ? h5Pool : adminPool;
}

// 为了兼容现有代码，导出一个通用的池
const pool = getPool();

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
    const dbConfig = getDbConfig();
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
    
    await connection.end();
    
    return true;
  } catch (error) {
    logger.error(`初始化数据库失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  pool,
  adminPool,
  h5Pool,
  getPool,
  testConnection,
  initDatabase
}; 