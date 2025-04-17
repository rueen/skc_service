/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 19:38:41
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
      .withMessage('auth.validation.loginTypeNotEmpty')
      .isIn(['phone', 'email'])
      .withMessage('auth.validation.invalidLoginType'),
    body('memberAccount')
      .notEmpty()
      .withMessage('auth.validation.memberAccountNotEmpty')
      .isString()
      .withMessage('auth.validation.memberAccountMustBeString'),
    body('areaCode')
      .optional()
      .isString()
      .withMessage('auth.validation.areaCodeMustBeString'),
    body('password')
      .notEmpty()
      .withMessage('auth.validation.passwordNotEmpty')
      .isLength({ min: 8, max: 20 })
      .withMessage('auth.validation.passwordLength')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('auth.validation.passwordMustContainLetterAndNumber'),
    body('inviteCode')
      .optional()
      .isString()
      .withMessage('auth.validation.inviteCodeMustBeString')
      .isLength({ max: 20 })
      .withMessage('auth.validation.inviteCodeLength')
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
      .withMessage('auth.validation.currentPasswordNotEmpty'),
    body('newPassword')
      .notEmpty()
      .withMessage('auth.validation.newPasswordNotEmpty')
      .isLength({ min: 8, max: 20 })
      .withMessage('auth.validation.newPasswordLength')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('auth.validation.newPasswordMustContainLetterAndNumber'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('auth.validation.confirmPasswordNotEmpty')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('auth.validation.confirmPasswordNotMatch');
        }
        return true;
      })
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authController.changePassword
);

module.exports = router; 