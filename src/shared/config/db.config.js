/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-20 09:17:21
 * @Description: 
 */
/**
 * 数据库配置文件
 * 从环境变量中读取数据库连接信息
 */
// 移除环境变量加载代码
// require('dotenv').config();

module.exports = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'skc',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}; 