/*
 * @Author: diaochan
 * @Date: 2025-04-19 16:45:38
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-21 11:53:42
 * @Description: 
 */
/**
 * API签名验证中间件
 */
const { verifySign } = require('../utils/api-sign.util');
const getApiSignConfig = require('../config/api-sign.config');
const { logger } = require('../config/logger.config');
const responseUtil = require('../utils/response.util');

/**
 * 判断路径是否需要跳过验证
 * @param {string} path - 请求路径
 * @param {Array} excludePaths - 排除的路径前缀
 * @returns {boolean} 是否跳过验证
 */
function shouldSkipAuth(path, excludePaths) {
  return excludePaths.some(prefix => path.startsWith(prefix));
}

/**
 * API签名验证中间件
 * @param {Object} options - 中间件选项
 * @returns {Function} Express中间件函数
 */
function apiSignMiddleware(options = {}) {
  const config = getApiSignConfig();
  
  // 合并自定义配置与默认配置
  const { 
    excludePaths = config.excludePaths,
    customExcludePaths = []
  } = options;
  
  // 合并排除路径
  const allExcludePaths = [...excludePaths, ...customExcludePaths];
  
  return (req, res, next) => {
    // 获取请求路径（去掉BASE_URL前缀）
    const baseUrl = options.baseUrl || '';
    const path = req.path.startsWith(baseUrl) 
      ? req.path.substring(baseUrl.length) 
      : req.path;
    
    // 判断是否跳过验证
    if (shouldSkipAuth(path, allExcludePaths)) {
      return next();
    }
    
    // 获取所有请求参数（合并query和body）
    const params = {
      ...req.query,
      ...req.body
    };
    // 验证签名
    const result = verifySign(params);
    
    if (!result.isValid) {
      logger.warn(`[API签名验证失败] ${req.method} ${req.originalUrl} - ${result.message} - IP: ${req.ip}`);
      
      return responseUtil.error(res, `API签名验证失败: ${result.message}`);
    }
    
    // 验证通过
    logger.debug(`[API签名验证通过] ${req.method} ${req.originalUrl}`);
    next();
  };
}

module.exports = apiSignMiddleware; 