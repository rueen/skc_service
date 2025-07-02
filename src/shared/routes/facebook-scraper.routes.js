/*
 * @Author: diaochan
 * @Date: 2025-06-21 17:13:19
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-02 18:33:44
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
 * @route GET /api/facebook/pool-stats
 * @desc 获取服务池状态信息（监控端点）
 * @access Public
 */
router.get('/pool-stats',
  rateLimiterMiddleware.apiLimiter,
  (req, res) => {
    try {
      const stats = facebookScraperController.getPoolStats();
      res.json({
        success: true,
        message: '获取池状态成功',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取池状态失败',
          details: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router; 