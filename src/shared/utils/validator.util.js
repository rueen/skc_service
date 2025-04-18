/**
 * 验证工具函数
 * 提供常用的数据验证函数
 */
const { validationResult } = require('express-validator');
const responseUtil = require('./response.util');

/**
 * 验证请求参数
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @returns {boolean} 验证是否通过
 */
const validateRequest = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    const lang = req.lang || req.query.lang || req.body.lang || 'zh-CN';
    
    const message = i18n.t(firstError.msg, lang);
    responseUtil.badRequest(res, message, {
      errors: errors.array().map(error => error.msg),
      errorFields: errors.array().map(error => error.param)
    });
    return false;
  }
  return true;
};

/**
 * 验证ID是否为正整数
 * @param {number|string} id - 要验证的ID
 * @returns {boolean} 是否为有效ID
 */
const isValidId = (id) => {
  return Number.isInteger(Number(id)) && Number(id) > 0;
};

/**
 * 验证日期字符串格式是否有效
 * @param {string} dateString - 日期字符串
 * @returns {boolean} 是否为有效日期
 */
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * 验证邮箱格式是否有效
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证手机号格式是否有效（支持全球格式）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为有效手机号
 */
const isValidPhone = (phone) => {
  // 全球手机号格式验证
  // 1. 允许+号开头（可选）
  // 2. 允许国家/地区代码（可选）
  // 3. 主体部分必须是数字，长度在5-15位之间
  const phoneRegex = /^(\+?\d{1,3}[-\s]?)?\d{5,15}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证URL格式是否有效
 * @param {string} url - URL地址
 * @returns {boolean} 是否为有效URL
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * 验证密码强度
 * 长度8-20位，必须包含字母和数字
 * @param {string} password - 密码
 * @returns {boolean} 是否为强密码
 */
const isStrongPassword = (password) => {
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/;
  return passwordRegex.test(password);
};

module.exports = {
  validateRequest,
  isValidId,
  isValidDate,
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isStrongPassword
};