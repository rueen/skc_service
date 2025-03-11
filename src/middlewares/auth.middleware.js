/**
 * 认证中间件
 * 验证用户是否已登录和权限检查
 */
const authUtil = require('../utils/auth.util');
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

/**
 * 验证用户是否已登录
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const verifyToken = (req, res, next) => {
  try {
    // 从请求头中提取令牌
    const token = authUtil.extractTokenFromHeader(req);
    if (!token) {
      return responseUtil.unauthorized(res, '未提供访问令牌');
    }

    // 验证令牌
    const decoded = authUtil.verifyToken(token);
    if (!decoded) {
      return responseUtil.unauthorized(res, '访问令牌无效或已过期');
    }

    // 将用户信息存储在请求对象中
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`认证中间件错误: ${error.message}`);
    return responseUtil.serverError(res);
  }
};

/**
 * 验证用户是否为管理员
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return responseUtil.unauthorized(res);
    }

    if (!req.user.isAdmin) {
      return responseUtil.forbidden(res, '需要管理员权限');
    }

    next();
  } catch (error) {
    logger.error(`管理员验证中间件错误: ${error.message}`);
    return responseUtil.serverError(res);
  }
};

/**
 * 验证用户是否拥有指定权限
 * @param {string|string[]} requiredPermissions - 所需权限
 * @returns {Function} Express中间件函数
 */
const hasPermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return responseUtil.unauthorized(res);
      }

      // 管理员拥有所有权限
      if (req.user.isAdmin) {
        return next();
      }

      // 获取用户权限列表
      const userPermissions = req.user.permissions || '';
      const permissionList = userPermissions.split(',').map(p => p.trim());

      // 检查是否拥有所需权限
      const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      const hasRequiredPermission = permissions.some(permission => 
        permissionList.includes(permission)
      );

      if (!hasRequiredPermission) {
        return responseUtil.forbidden(res, '无权执行此操作');
      }

      next();
    } catch (error) {
      logger.error(`权限验证中间件错误: ${error.message}`);
      return responseUtil.serverError(res);
    }
  };
};

module.exports = {
  verifyToken,
  isAdmin,
  hasPermission
}; 