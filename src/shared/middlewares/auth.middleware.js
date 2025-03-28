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
 * 可选的令牌验证
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const optionalVerifyToken = (req, res, next) => {
  try {
    // 从请求头中提取令牌
    const token = authUtil.extractTokenFromHeader(req);
    if (!token) {
      // 如果没有提供令牌，继续处理但用户信息为null
      req.user = null;
      return next();
    }
    
    // 验证令牌
    const decoded = authUtil.verifyToken(token);
    if (!decoded) {
      // 如果令牌无效，继续处理但用户信息为null
      req.user = null;
      return next();
    }
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    // 捕获任何错误，记录日志，但仍然继续
    logger.error(`可选令牌验证失败: ${error.message}`);
    req.user = null;
    next();
  }
};

/**
 * 限制只有管理员才能访问
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return responseUtil.unauthorized(res, '未授权');
  }
  
  if (!req.user.isAdmin) {
    return responseUtil.forbidden(res, '需要管理员权限');
  }
  
  next();
};

/**
 * 检查用户是否拥有特定权限
 * @param {string|string[]} permissionCode - 权限代码或权限代码数组
 * @returns {Function} 中间件函数
 */
const hasPermission = (permissionCode) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return responseUtil.unauthorized(res, '未授权');
      }
      
      // 管理员默认拥有所有权限
      if (req.user.isAdmin) {
        return next();
      }
      
      // 获取用户权限列表
      let userPermissions = [];
      if (req.user.permissions) {
        // 处理可能的字符串权限列表 (逗号分隔)
        if (typeof req.user.permissions === 'string') {
          userPermissions = req.user.permissions.split(',').map(p => p.trim());
        } 
        // 处理数组类型的权限列表
        else if (Array.isArray(req.user.permissions)) {
          userPermissions = req.user.permissions;
        }
      }
      
      // 将单个权限转换为数组
      const requiredPermissions = Array.isArray(permissionCode) 
        ? permissionCode 
        : [permissionCode];
      
      // 检查是否有至少一个所需权限
      const hasRequiredPermission = requiredPermissions.some(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasRequiredPermission) {
        return responseUtil.forbidden(res, `需要 ${requiredPermissions.join(' 或 ')} 权限`);
      }
      
      next();
    } catch (error) {
      logger.error(`权限验证中间件错误: ${error.message}`);
      return responseUtil.serverError(res, '验证权限失败');
    }
  };
};

module.exports = {
  verifyToken,
  optionalVerifyToken,
  isAdmin,
  hasPermission // 导出别名以保持兼容性
}; 