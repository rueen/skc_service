/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-30 20:01:01
 * @Description: 
 */
/**
 * 限流中间件
 * 防止API被过度请求，保护服务器资源
 */
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger.config');
const responseUtil = require('../utils/response.util');
const { apiLimiterConfig, loginLimiterConfig } = require('../config/rateLimiter.config');

/**
 * 创建通用限流中间件
 */
const apiLimiter = rateLimit({
  ...apiLimiterConfig,
  message: {
    code: 4290,
    message: '请求过于频繁，请稍后再试',
    data: {}
  },
  handler: (req, res, next, options) => {
    logger.warn(`IP ${req.ip} 超过请求限制`);
    responseUtil.error(res, '请求过于频繁，请稍后再试', 4290, 429);
  }
});

/**
 * 创建登录接口限流中间件
 * 登录接口使用更严格的限流策略
 */
const loginLimiter = rateLimit({
  ...loginLimiterConfig,
  message: {
    code: 4290,
    message: '登录尝试次数过多，请1小时后再试',
    data: {}
  },
  handler: (req, res, next, options) => {
    logger.warn(`IP ${req.ip} 登录尝试次数过多`);
    responseUtil.error(res, '登录尝试次数过多，请1小时后再试', 4290, 429);
  }
});

module.exports = {
  apiLimiter,
  loginLimiter
}; 