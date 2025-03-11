/**
 * 响应工具函数
 * 统一处理API响应格式
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 */
const success = (res, data = {}, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    code: 0,
    message,
    data
  });
};

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} code - 业务错误码
 * @param {number} statusCode - HTTP状态码
 */
const error = (res, message = '操作失败', code = 5001, statusCode = 400) => {
  return res.status(statusCode).json({
    code,
    message,
    data: {}
  });
};

/**
 * 参数错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const badRequest = (res, message = '参数错误') => {
  return error(res, message, 4001, 400);
};

/**
 * 未授权响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const unauthorized = (res, message = '未授权或登录已过期') => {
  return error(res, message, 4010, 401);
};

/**
 * 禁止访问响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const forbidden = (res, message = '无权访问') => {
  return error(res, message, 4030, 403);
};

/**
 * 资源不存在响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const notFound = (res, message = '资源不存在') => {
  return error(res, message, 4040, 404);
};

/**
 * 服务器错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const serverError = (res, message = '服务器内部错误') => {
  return error(res, message, 5001, 500);
};

module.exports = {
  success,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError
}; 