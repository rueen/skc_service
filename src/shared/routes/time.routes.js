/**
 * 时间路由
 * 处理时间相关的路由
 */
const express = require('express');
const timeController = require('../controllers/time.controller');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/time/server
 * @desc 获取服务器当前时间戳
 * @access Public
 */
router.get(
  '/server', 
  rateLimiterMiddleware.apiLimiter,
  timeController.getServerTime
);

module.exports = router; 