/*
 * @Author: diaochan
 * @Date: 2025-06-21 17:13:19
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-24 10:55:47
 * @Description: 
 */
/**
 * Facebook 数据抓取路由
 * 定义 Facebook 数据抓取相关的 API 端点
 */
const express = require('express');
const FacebookScraperController = require('../controllers/facebook-scraper.controller');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');

const router = express.Router();
const facebookScraperController = new FacebookScraperController();

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
  rateLimiterMiddleware.apiLimiter, // 使用统一的API限流
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
  rateLimiterMiddleware.apiLimiter, // 使用统一的API限流
  (req, res) => facebookScraperController.batchScrapeData(req, res)
);



module.exports = router; 