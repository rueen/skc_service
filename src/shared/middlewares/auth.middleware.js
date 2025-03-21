/**
 * 认证中间件
 * 处理用户认证和授权
 */
const authUtil = require('../utils/auth.util');
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

/**
 * 验证JWT令牌
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const verifyToken = (req, res, next) => {
  try {
    // 从请求头中提取令牌
    const token = authUtil.extractTokenFromHeader(req);
    if (!token) {
      return responseUtil.unauthorized(res, '未提供认证令牌');
    }
    
    // 验证令牌
    const decoded = authUtil.verifyToken(token);
    if (!decoded) {
      return responseUtil.unauthorized(res, '认证令牌无效或已过期');
    }
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`验证令牌失败: ${error.message}`);
    return responseUtil.unauthorized(res, '认证失败');
  }
};

/**
 * 可选的JWT令牌验证
 * 如果提供了有效的令牌，将解析用户信息并添加到请求中
 * 但如果没有提供令牌或令牌无效，仍然允许请求继续
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const optionalToken = (req, res, next) => {
  try {
    // 从请求头中提取令牌
    const token = authUtil.extractTokenFromHeader(req);
    if (token) {
      // 验证令牌
      try {
        const decoded = authUtil.verifyToken(token);
        if (decoded) {
          // 将用户信息添加到请求对象
          req.user = decoded;
        }
      } catch (error) {
        // 令牌无效，但我们不阻止请求
        logger.warn(`可选令牌验证: 令牌无效或已过期 - ${error.message}`);
      }
    }
    // 无论令牌是否有效，都继续处理请求
    next();
  } catch (error) {
    // 出现错误，记录日志但仍然继续
    logger.error(`可选令牌验证失败: ${error.message}`);
    next();
  }
};

/**
 * 限制访问权限
 * @param {Array} roles - 允许访问的角色列表
 * @returns {Function} 中间件函数
 */
const restrictTo = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return responseUtil.unauthorized(res, '未授权');
    }
    
    if (!roles.includes(req.user.role)) {
      return responseUtil.forbidden(res, '无权访问此资源');
    }
    
    next();
  };
};

/**
 * 限制只有资源所有者才能访问
 * @param {Function} getResourceOwnerId - 获取资源所有者ID的函数
 * @returns {Function} 中间件函数
 */
const restrictToOwner = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return responseUtil.unauthorized(res, '未授权');
      }
      
      const ownerId = await getResourceOwnerId(req);
      
      if (req.user.id !== ownerId) {
        return responseUtil.forbidden(res, '无权访问此资源');
      }
      
      next();
    } catch (error) {
      logger.error(`验证资源所有权失败: ${error.message}`);
      return responseUtil.serverError(res, '验证资源所有权失败');
    }
  };
};

module.exports = {
  verifyToken,
  optionalToken,
  restrictTo,
  restrictToOwner
}; 