/**
 * H5端支付渠道路由
 */
const express = require('express');
const paymentChannelController = require('../controllers/payment-channel.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 路由需要会员认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/payment-channels
 * @desc 获取支付渠道列表
 * @access Private
 */
router.get(
  '/',
  paymentChannelController.getPaymentChannels
);

module.exports = router; 