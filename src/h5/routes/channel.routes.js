/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-30 16:18:58
 * @Description: 
 */
/**
 * H5端渠道路由
 * 处理渠道相关的路由
 */
const express = require('express');
const channelController = require('../controllers/channel.controller');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/channels
 * @desc 获取渠道列表
 * @access Private
 */
router.get(
  '/',
  channelController.getList
);

module.exports = router; 