/**
 * 认证路由
 * 处理用户登录和认证相关的路由
 */
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route POST /api/admin/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post(
  '/login',
  rateLimiterMiddleware.loginLimiter,
  [
    body('username')
      .notEmpty()
      .withMessage('用户名不能为空'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
  ],
  (req, res, next) => {
    // 验证请求参数
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  authController.login
);

/**
 * @route POST /api/admin/auth/logout
 * @desc 用户退出登录
 * @access Private
 */
router.post(
  '/logout',
  authMiddleware.verifyToken,
  authController.logout
);

/**
 * @route GET /api/admin/user/info
 * @desc 获取当前用户信息
 * @access Private
 */
router.get(
  '/info',
  authMiddleware.verifyToken,
  authController.getCurrentUser
);

module.exports = router; 