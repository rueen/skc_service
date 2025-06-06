/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 17:33:38
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
      .withMessage('common.validation.invalid'),
    body('memberAccount')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('areaCode')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('password')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ min: 8, max: 20 })
      .withMessage('common.validation.memberPasswordLength')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('common.validation.memberPasswordFormat'),
    body('inviteCode')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
      .isLength({ max: 20 })
      .withMessage('common.validation.maxLength{max:20}')
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
      .withMessage('common.validation.memberPasswordLength')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('common.validation.memberPasswordFormat'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('common.validation.confirmPasswordNotMatch');
        }
        return true;
      })
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authController.changePassword
);

module.exports = router; 