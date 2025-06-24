/**
 * 错误处理中间件
 * 统一处理应用程序中的错误
 */
const { logger } = require('../config/logger.config');
const responseUtil = require('../utils/response.util');

/**
 * 404错误处理中间件
 * 处理未找到的路由
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
const notFoundHandler = (req, res) => {
  logger.warn(`未找到路由: ${req.method} ${req.originalUrl}`);
  return responseUtil.notFound(res, '请求的资源不存在');
};

/**
 * 全局错误处理中间件
 * 捕获并处理应用程序中的所有错误
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误详情
  logger.error(`全局错误: ${err.message}`);
  logger.error(err.stack);

  // 根据错误类型返回不同的响应
  if (err.name === 'ValidationError') {
    return responseUtil.badRequest(res, err.message);
  }

  if (err.name === 'UnauthorizedError') {
    return responseUtil.unauthorized(res, err.message);
  }

  if (err.name === 'ForbiddenError') {
    return responseUtil.forbidden(res, err.message);
  }

  if (err.name === 'NotFoundError') {
    return responseUtil.notFound(res, err.message);
  }

  // 默认返回500错误
  return responseUtil.serverError(res, '服务器内部错误');
};

module.exports = {
  notFoundHandler,
  errorHandler
}; 