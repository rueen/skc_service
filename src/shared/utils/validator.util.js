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
    responseUtil.badRequest(res, firstError.msg);
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
 * 验证手机号格式是否有效
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为有效手机号
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
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
 * 至少8位，包含大小写字母和数字
 * @param {string} password - 密码
 * @returns {boolean} 是否为强密码
 */
const isStrongPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
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