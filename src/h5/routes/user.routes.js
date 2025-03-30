/*
 * @Author: diaochan
 * @Date: 2025-03-15 22:03:25
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-30 16:23:23
 * @Description: 
 */
/**
 * H5端用户路由
 * 处理用户信息相关的路由
 */
const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/user/info
 * @desc 获取用户信息
 * @access Private
 */
router.get(
  '/info',
  authController.getUserInfo
);

module.exports = router; 