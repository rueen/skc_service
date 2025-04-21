/*
 * @Author: diaochan
 * @Date: 2025-03-29 21:03:45
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-30 19:43:39
 * @Description: 
 */
/**
 * 通知路由
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route   GET /api/h5/notifications
 * @desc    获取未读通知列表
 * @access  Private
 */
router.get(
  '/',
  notificationController.getUnreadNotifications
);

/**
 * @route   PUT /api/h5/notifications/:id/read
 * @desc    标记通知为已读
 * @access  Private
 */
router.put(
  '/:id/read',
  notificationController.markNotificationAsRead
);

/**
 * @route   POST /api/h5/notifications/batch-read
 * @desc    批量标记通知为已读
 * @access  Private
 */
router.post(
  '/batch-read',
  notificationController.batchMarkNotificationsAsRead
);

module.exports = router; 