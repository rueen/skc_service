/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-16 10:04:41
 * @Description: 
 */
/**
 * 限流中间件
 * 防止API被过度请求，保护服务器资源
 */
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger.config');
const responseUtil = require('../utils/response.util');
// 移除环境变量加载代码
// require('dotenv').config();

// 从环境变量获取限流配置
// 安全地解析时间窗口配置
const parseWindowMs = () => {
  const configValue = process.env.RATE_LIMIT_WINDOW_MS;
  if (!configValue) return 15 * 60 * 1000; // 默认15分钟
  
  try {
    // 尝试将配置值作为数学表达式计算
    // 例如 "15*60*1000" => 900000
    return Function('"use strict";return (' + configValue + ')')();
  } catch (error) {
    logger.error(`解析RATE_LIMIT_WINDOW_MS失败: ${error.message}`);
    return 15 * 60 * 1000; // 默认15分钟
  }
};

const windowMs = parseWindowMs();
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
    responseUtil.error(res, '请求过于频繁，请稍后再试', 4290, 429);
  }
});

/**
 * 创建登录接口限流中间件
 * 登录接口使用更严格的限流策略
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 每个IP最多20次登录尝试
  standardHeaders: true,
  legacyHeaders: false,
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