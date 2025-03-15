/**
 * H5端渠道路由
 * 处理渠道相关的路由
 */
const express = require('express');
const channelController = require('../../controllers/h5/channel.controller');
const rateLimiterMiddleware = require('../../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/h5/channels
 * @desc 获取渠道列表
 * @access Public
 */
router.get(
  '/',
  rateLimiterMiddleware.apiLimiter,
  channelController.getList
);

module.exports = router; 