/*
 * @Author: diaochan
 * @Date: 2025-04-19 16:45:18
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-19 20:00:55
 * @Description: 
 */
/**
 * API签名工具
 * 用于生成和验证API请求签名
 */
const crypto = require('crypto');
const logger = require('../config/logger.config');
const getApiSignConfig = require('../config/api-sign.config');

/**
 * 生成API签名
 * @param {Object} params - 请求参数
 * @returns {string} 签名结果
 */
function generateSign(params) {
  const { secret } = getApiSignConfig();
  
  // 过滤参数：排除sign参数和空值
  const filteredParams = {};
  for (const key in params) {
    if (key !== 'sign' && key !== 'lang' && params[key] !== undefined && params[key] !== '' && params[key] !== null) {
      // 确保数字值不会转换为科学计数法
      if (typeof params[key] === 'number') {
        filteredParams[key] = params[key].toString();
      } else {
        filteredParams[key] = params[key];
      }
    }
  }
  
  // 按参数名ASCII码从小到大排序（字典序）
  const sortedKeys = Object.keys(filteredParams).sort();
  
  // 构建签名字符串：key1=value1&key2=value2
  let signStr = '';
  for (const key of sortedKeys) {
    signStr += (signStr ? '&' : '') + `${key}=${filteredParams[key]}`;
  }
  
  // 附加密钥
  signStr += `&secret=${secret}`;
  
  // console.log("后端签名前字符串:", signStr);
  // 使用MD5进行加密
  return crypto.createHash('md5').update(signStr).digest('hex');
}

/**
 * 验证签名
 * @param {Object} params - 请求参数(包含sign)
 * @returns {Object} 验证结果 {isValid, message}
 */
function verifySign(params) {
  const { expireTime, timeOffset } = getApiSignConfig();
  
  // 基础检查
  if (!params.sign) {
    return { isValid: false, message: '缺少签名参数' };
  }
  
  if (!params.timestamp) {
    return { isValid: false, message: '缺少时间戳参数' };
  }
  
  if (!params.nonce) {
    return { isValid: false, message: '缺少随机字符串参数' };
  }
  
  // 验证时间戳
  const now = Math.floor(Date.now() / 1000);
  const timestamp = parseInt(params.timestamp, 10);
  
  if (isNaN(timestamp)) {
    return { isValid: false, message: '时间戳格式错误' };
  }
  
  if (now - timestamp > expireTime) {
    return { isValid: false, message: '请求已过期' };
  }
  
  if (Math.abs(now - timestamp) > timeOffset) {
    return { isValid: false, message: '时间戳与服务器时间不同步' };
  }
  
  // 获取客户提供的签名
  const providedSign = params.sign;
  // 生成服务端签名
  const generatedSign = generateSign(params);
  
  // 比较签名
  if (providedSign !== generatedSign) {
    return { isValid: false, message: '签名验证失败' };
  }
  
  return { isValid: true, message: '签名验证通过' };
}

module.exports = {
  generateSign,
  verifySign
}; 