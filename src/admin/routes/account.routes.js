/*
 * @Author: diaochan
 * @Date: 2025-03-20 10:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-19 15:32:37
 * @Description: 
 */
/**
 * 账号管理路由
 * 处理管理端账号相关的路由
 */
const express = require('express');
const { body } = require('express-validator');
const accountController = require('../controllers/account.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 应用中间件
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/support/accounts
 * @desc 获取账号列表
 * @access Private - Admin
 */
router.get(
  '/',
  accountController.getAccounts
);

/**
 * @route POST /api/support/accounts/batchResolve
 * @desc 批量审核通过账号
 * @access Private - Admin
 */
router.post(
  '/batchResolve',
  [
    body('ids')
      .isArray()
      .withMessage('ids必须是数组')
      .notEmpty()
      .withMessage('ids不能为空')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  accountController.batchResolve
);

/**
 * @route POST /api/support/accounts/batchReject
 * @desc 批量审核拒绝账号
 * @access Private - Admin
 */
router.post(
  '/batchReject',
  [
    body('ids')
      .isArray()
      .withMessage('ids必须是数组')
      .notEmpty()
      .withMessage('ids不能为空'),
    body('rejectReason')
      .optional()
      .isString()
      .withMessage('拒绝原因必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  accountController.batchReject
);

module.exports = router; 