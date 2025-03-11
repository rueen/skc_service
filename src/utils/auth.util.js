/**
 * 认证工具函数
 * 处理JWT令牌生成和验证
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authConfig = require('../config/auth.config');
const logger = require('../config/logger.config');

/**
 * 生成JWT令牌
 * @param {Object} payload - 令牌载荷数据
 * @returns {string} JWT令牌
 */
const generateToken = (payload) => {
  try {
    return jwt.sign(payload, authConfig.secret, { expiresIn: authConfig.expiresIn });
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
    return jwt.verify(token, authConfig.secret);
  } catch (error) {
    logger.error(`验证JWT令牌失败: ${error.message}`);
    return null;
  }
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
  hashPassword,
  comparePassword,
  extractTokenFromHeader
}; 