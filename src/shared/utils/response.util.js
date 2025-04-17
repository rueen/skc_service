/*
 * @Author: diaochan
 * @Date: 2025-03-11 20:46:54
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-12 14:33:20
 * @Description: 
 */
/**
 * 响应工具函数
 * 统一处理API响应格式
 */
const i18n = require('./i18n.util');

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 */
const success = (res, data = {}, message = null, statusCode = 200) => {
  // 使用国际化翻译，如果没有提供消息，则使用默认的成功消息
  const lang = res.req.lang || 'zh-CN';
  const finalMessage = message || i18n.t('common.success', lang);

  return res.status(statusCode).json({
    code: 0,
    message: finalMessage,
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
const error = (res, message = null, code = 5001, statusCode = 400) => {
  // 使用国际化翻译，如果没有提供消息，则使用默认的失败消息
  const lang = res.req.lang || 'zh-CN';
  const finalMessage = message || i18n.t('common.failed', lang);

  return res.status(statusCode).json({
    code,
    message: finalMessage,
    data: {}
  });
};

/**
 * 参数错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const badRequest = (res, message = null) => {
  const lang = res.req.lang || 'zh-CN';
  const finalMessage = message || i18n.t('common.badRequest', lang);
  return error(res, finalMessage, 4001, 400);
};

/**
 * 未授权响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const unauthorized = (res, message = null) => {
  const lang = res.req.lang || 'zh-CN';
  const finalMessage = message || i18n.t('common.unauthorized', lang);
  return error(res, finalMessage, 4010, 401);
};

/**
 * 禁止访问响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const forbidden = (res, message = null) => {
  const lang = res.req.lang || 'zh-CN';
  const finalMessage = message || i18n.t('common.forbidden', lang);
  return error(res, finalMessage, 4030, 403);
};

/**
 * 资源不存在响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const notFound = (res, message = null) => {
  const lang = res.req.lang || 'zh-CN';
  const finalMessage = message || i18n.t('common.notFound', lang);
  return error(res, finalMessage, 4040, 404);
};

/**
 * 服务器错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const serverError = (res, message = null) => {
  const lang = res.req.lang || 'zh-CN';
  const finalMessage = message || i18n.t('common.serverError', lang);
  return error(res, finalMessage, 5001, 500);
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