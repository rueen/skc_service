/**
 * 通知路由
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

/**
 * @route   GET /api/h5/notifications
 * @desc    获取未读通知列表
 * @access  Private
 */
router.get(
  '/',
  authMiddleware.verifyToken,
  notificationController.getUnreadNotifications
);

/**
 * @route   PUT /api/h5/notifications/:id/read
 * @desc    标记通知为已读
 * @access  Private
 */
router.put(
  '/:id/read',
  authMiddleware.verifyToken,
  notificationController.markNotificationAsRead
);

module.exports = router; 