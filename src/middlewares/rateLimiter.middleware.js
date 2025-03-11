/**
 * 限流中间件
 * 防止API被过度请求，保护服务器资源
 */
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger.config');
require('dotenv').config();

// 从环境变量获取限流配置
const windowMs = eval(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 默认15分钟
const max = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100; // 默认每个IP最多100次请求

/**
 * 创建通用限流中间件
 */
const apiLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 4290,
    message: '请求过于频繁，请稍后再试',
    data: {}
  },
  handler: (req, res, next, options) => {
    logger.warn(`IP ${req.ip} 超过请求限制`);
    res.status(429).json(options.message);
  }
});

/**
 * 创建登录接口限流中间件
 * 登录接口使用更严格的限流策略
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 每个IP最多10次登录尝试
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 4290,
    message: '登录尝试次数过多，请1小时后再试',
    data: {}
  },
  handler: (req, res, next, options) => {
    logger.warn(`IP ${req.ip} 登录尝试次数过多`);
    res.status(429).json(options.message);
  }
});

module.exports = {
  apiLimiter,
  loginLimiter
}; 