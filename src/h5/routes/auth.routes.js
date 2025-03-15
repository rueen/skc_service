/**
 * H5端认证路由
 * 处理用户登录、注册等认证相关的路由
 */
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

/**
 * @route POST /api/h5/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post(
  '/register',
  rateLimiterMiddleware.apiLimiter,
  [
    body('memberAccount')
      .notEmpty()
      .withMessage('账号不能为空')
      .isLength({ min: 4, max: 20 })
      .withMessage('账号长度必须在4-20个字符之间')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('账号只能包含字母、数字和下划线'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
      .isLength({ min: 6, max: 20 })
      .withMessage('密码长度必须在6-20个字符之间'),
    body('memberNickname')
      .notEmpty()
      .withMessage('昵称不能为空')
      .isLength({ max: 20 })
      .withMessage('昵称长度不能超过20个字符'),
    body('inviteCode')
      .optional()
      .isLength({ max: 20 })
      .withMessage('邀请码长度不能超过20个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authController.register
);

/**
 * @route POST /api/h5/auth/login
 * @desc 用户登录（支持手机号和邮箱登录）
 * @access Public
 */
router.post(
  '/login',
  rateLimiterMiddleware.loginLimiter,
  [
    body('loginType')
      .notEmpty()
      .withMessage('登录类型不能为空')
      .isIn(['phone', 'email'])
      .withMessage('登录类型必须为phone或email'),
    body('memberAccount')
      .notEmpty()
      .withMessage('账号不能为空')
      .isString()
      .withMessage('账号必须为字符串'),
    body('areaCode')
      .optional()
      .isString()
      .withMessage('区号必须为字符串'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
      .isLength({ min: 6, max: 20 })
      .withMessage('密码长度必须在6-20个字符之间')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authController.login
);

/**
 * @route POST /api/h5/auth/logout
 * @desc 用户退出登录
 * @access Private
 */
router.post(
  '/logout',
  authMiddleware.verifyToken,
  authController.logout
);

module.exports = router; 