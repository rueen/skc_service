/**
 * 认证工具函数
 * 处理JWT令牌生成和验证
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const logger = require('../config/logger.config');

/**
 * 生成JWT令牌
 * @param {Object} payload - 令牌载荷数据
 * @returns {string} JWT令牌
 */
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
  } catch (error) {
    logger.error(`生成JWT令牌失败: ${error.message}`);
    throw new Error('生成令牌失败');
  }
};

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {Object|null} 解码后的载荷数据或null
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.error(`验证JWT令牌失败: ${error.message}`);
    return null;
  }
};

/**
 * 检查令牌是否在密码修改后签发
 * @param {Object} decoded - 解码后的令牌
 * @param {Date} passwordChangedTime - 密码修改时间
 * @returns {boolean} 是否有效
 */
const isTokenIssuedAfterPasswordChange = (decoded, passwordChangedTime) => {
  if (!passwordChangedTime) {
    return true; // 如果没有密码修改记录，则令牌有效
  }
  
  // 将密码修改时间转换为时间戳（秒）
  const changedTimestamp = parseInt(passwordChangedTime.getTime() / 1000, 10);
  
  // 令牌签发时间
  const issuedAt = decoded.iat || 0;
  
  // 如果令牌在密码修改之前签发，则令牌无效
  return issuedAt >= changedTimestamp;
};

/**
 * 哈希密码
 * @param {string} password - 原始密码
 * @returns {Promise<string>} 哈希后的密码
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    logger.error(`密码哈希失败: ${error.message}`);
    throw new Error('密码处理失败');
  }
};

/**
 * 验证密码
 * @param {string} password - 原始密码
 * @param {string} hashedPassword - 哈希后的密码
 * @returns {Promise<boolean>} 密码是否匹配
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error(`密码验证失败: ${error.message}`);
    return false;
  }
};

/**
 * 从请求头中提取令牌
 * @param {Object} req - Express请求对象
 * @returns {string|null} JWT令牌或null
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

module.exports = {
  generateToken,
  verifyToken,
  isTokenIssuedAfterPasswordChange,
  hashPassword,
  comparePassword,
  extractTokenFromHeader
}; 