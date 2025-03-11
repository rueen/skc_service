/**
 * 认证配置文件
 * 从环境变量中读取JWT配置信息
 */
require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
}; 