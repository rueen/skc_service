/**
 * Facebook 数据抓取路由
 * 定义 Facebook 数据抓取相关的 API 端点
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const FacebookScraperController = require('../controllers/facebook-scraper.controller');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

const router = express.Router();
const facebookScraperController = new FacebookScraperController();

// Facebook 数据抓取限流配置（更严格的限制）
const facebookScraperLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: 10, // 每分钟最多 10 次请求
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Facebook 数据抓取请求过于频繁，请稍后再试'
  },
  handler: (req, res, next, options) => {
    logger.warn(`IP ${req.ip} Facebook 抓取请求超过限制`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Facebook 数据抓取请求过于频繁，请稍后再试'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// 批量抓取限流（更严格）
const batchScraperLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 分钟
  max: 3, // 每5分钟最多 3 次批量请求
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: '批量抓取请求过于频繁，请稍后再试'
  },
  handler: (req, res, next, options) => {
    logger.warn(`IP ${req.ip} Facebook 批量抓取请求超过限制`);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '批量抓取请求过于频繁，请稍后再试'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route POST /api/facebook/scrape
 * @desc 抓取 Facebook 数据
 * @access Public
 * @body {string} url - Facebook 链接
 * @body {string} [type] - 数据类型 (profile|post|group)，可选，不提供时自动识别
 * @body {Object} [options] - 抓取选项
 * @body {number} [options.timeout=30000] - 超时时间（毫秒）
 * @body {number} [options.retries=3] - 重试次数
 * @body {boolean} [options.headless=true] - 是否无头模式
 */
router.post('/scrape', 
  facebookScraperLimiter,
  FacebookScraperController.getValidationRules(),
  (req, res) => facebookScraperController.scrapeData(req, res)
);

/**
 * @route POST /api/facebook/batch-scrape
 * @desc 批量抓取 Facebook 数据
 * @access Public
 * @body {Array} urls - Facebook 链接数组，每个元素可以是字符串或对象 {url, type}
 * @body {Object} [options] - 抓取选项
 */
router.post('/batch-scrape',
  batchScraperLimiter,
  (req, res) => facebookScraperController.batchScrapeData(req, res)
);



module.exports = router; 