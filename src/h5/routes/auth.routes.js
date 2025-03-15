/**
 * H5端认证路由
 * 处理用户登录、注册等认证相关的路由
 */
const express = require('express');
const { body } = require('express-validator');
const authController = require('../../controllers/h5/auth.controller');
const validatorUtil = require('../../utils/validator.util');
const rateLimiterMiddleware = require('../../middlewares/rateLimiter.middleware');

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
 * @desc 用户登录
 * @access Public
 */
router.post(
  '/login',
  rateLimiterMiddleware.apiLimiter,
  [
    body('memberAccount')
      .notEmpty()
      .withMessage('账号不能为空'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authController.login
);

module.exports = router; 