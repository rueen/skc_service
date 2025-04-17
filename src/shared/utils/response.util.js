/*
 * @Author: diaochan
 * @Date: 2025-03-11 20:46:54
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 10:33:43
 * @Description: 
 */
/**
 * 响应工具函数
 * 统一处理API响应格式
 */
const { getMessage } = require('../i18n');

/**
 * 处理消息，支持多语言
 * @param {Object} req - Express请求对象
 * @param {string} message - 消息文本或i18n键值
 * @param {Object} params - 替换参数
 * @returns {string} 处理后的消息
 */
const processMessage = (req, message, params = {}) => {
  // 如果消息为空，返回默认值
  if (!message) {
    return '操作成功';
  }

  // 如果消息不是字符串或不含点号，直接返回
  if (typeof message !== 'string' || !message.includes('.')) {
    return message;
  }

  // 获取语言参数
  const lang = req && (req.query.lang || req.body.lang || req.headers['accept-language']) || 'zh-CN';

  // 尝试获取翻译
  return getMessage(lang, message, params);
};

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息或i18n键值
 * @param {number} statusCode - HTTP状态码
 * @param {Object} params - 替换参数
 */
const success = (res, data = {}, message = 'common.success', statusCode = 200, params = {}) => {
  const processedMessage = processMessage(res.req, message, params);

  return res.status(statusCode).json({
    code: 0,
    message: processedMessage,
    data
  });
};

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息或i18n键值
 * @param {number} code - 业务错误码
 * @param {number} statusCode - HTTP状态码
 * @param {Object} params - 替换参数
 */
const error = (res, message = 'common.error', code = 5001, statusCode = 400, params = {}) => {
  const processedMessage = processMessage(res.req, message, params);
  
  return res.status(statusCode).json({
    code,
    message: processedMessage,
    data: {}
  });
};

/**
 * 参数错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息或i18n键值
 * @param {Object} params - 替换参数
 */
const badRequest = (res, message = 'common.badRequest', params = {}) => {
  return error(res, message, 4001, 400, params);
};

/**
 * 未授权响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息或i18n键值
 * @param {Object} params - 替换参数
 */
const unauthorized = (res, message = 'common.unauthorized', params = {}) => {
  return error(res, message, 4010, 401, params);
};

/**
 * 禁止访问响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息或i18n键值
 * @param {Object} params - 替换参数
 */
const forbidden = (res, message = 'common.forbidden', params = {}) => {
  return error(res, message, 4030, 403, params);
};

/**
 * 资源不存在响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息或i18n键值
 * @param {Object} params - 替换参数
 */
const notFound = (res, message = 'common.notFound', params = {}) => {
  return error(res, message, 4040, 404, params);
};

/**
 * 服务器错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息或i18n键值
 * @param {Object} params - 替换参数
 */
const serverError = (res, message = 'common.serverError', params = {}) => {
  return error(res, message, 5001, 500, params);
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