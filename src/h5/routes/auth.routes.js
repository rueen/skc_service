/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 16:04:04
 * @Description: 
 */
/**
 * H5端认证路由
 * 处理用户登录、注册等认证相关的路由
 */
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

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
      .withMessage('common.validation.mustNotBeEmpty')
      .isIn(['phone', 'email'])
      .withMessage('登录类型必须为phone或email'),
    body('memberAccount')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isString()
      .withMessage('账号必须为字符串'),
    body('areaCode')
      .optional()
      .isString()
      .withMessage('区号必须为字符串'),
    body('password')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ min: 8, max: 20 })
      .withMessage('密码长度必须在8-20个字符之间')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('密码必须包含字母和数字'),
    body('inviteCode')
      .optional()
      .isString()
      .withMessage('邀请码必须为字符串')
      .isLength({ max: 20 })
      .withMessage('邀请码长度不能超过20个字符')
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

/**
 * @route POST /api/h5/auth/change-password
 * @desc 修改密码
 * @access Private
 */
router.post(
  '/change-password',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty'),
    body('newPassword')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ min: 8, max: 20 })
      .withMessage('新密码长度必须在8-20个字符之间')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('新密码必须包含字母和数字'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('确认密码与新密码不一致');
        }
        return true;
      })
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authController.changePassword
);

module.exports = router; 