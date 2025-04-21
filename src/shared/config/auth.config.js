/**
 * 认证配置文件
 * 从环境变量中读取JWT配置信息
 */
// 移除环境变量加载代码
// require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN,
}; 