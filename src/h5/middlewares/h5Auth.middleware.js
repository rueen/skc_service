/**
 * H5端认证中间件
 * 处理H5端用户认证相关的中间件
 */
const jwt = require('jsonwebtoken');
const { STATUS_CODES, MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * 验证JWT令牌
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
function verifyToken(req, res, next) {
  // 从请求头或查询参数中获取令牌
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  
  if (!token) {
    return res.status(401).json({
      code: STATUS_CODES.UNAUTHORIZED,
      message: '未提供认证令牌'
    });
  }
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    
    // 继续下一个中间件
    next();
  } catch (error) {
    logger.error(`令牌验证失败: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: STATUS_CODES.UNAUTHORIZED,
        message: '认证令牌已过期'
      });
    }
    
    return res.status(401).json({
      code: STATUS_CODES.UNAUTHORIZED,
      message: '无效的认证令牌'
    });
  }
}

module.exports = {
  verifyToken
}; 