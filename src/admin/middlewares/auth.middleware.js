/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-15 22:16:58
 * @Description: 
 */
/**
 * 管理后台认证中间件
 * 提供管理后台特有的权限验证功能
 */
const { verifyToken } = require('../../shared/middlewares/auth.middleware');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');

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
  verifyToken,  // 从shared中导出，保持接口一致性
  isAdmin,
  hasPermission
}; 