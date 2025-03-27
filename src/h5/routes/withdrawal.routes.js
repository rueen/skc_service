/**
 * H5端提现路由
 * 处理提现相关的路由
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const withdrawalController = require('../controllers/withdrawal.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const { WithdrawalAccountType, WithdrawalStatus } = require('../../shared/config/enums');

const router = express.Router();

/**
 * @route POST /api/h5/withdrawal/accounts
 * @desc 创建提现账户
 * @access Private
 */
router.post(
  '/accounts',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('accountType')
      .isIn(Object.values(WithdrawalAccountType))
      .withMessage('无效的账户类型'),
    body('account')
      .notEmpty()
      .withMessage('账号不能为空')
      .isLength({ max: 100 })
      .withMessage('账号长度不能超过100个字符'),
    body('name')
      .notEmpty()
      .withMessage('姓名不能为空')
      .isLength({ max: 50 })
      .withMessage('姓名长度不能超过50个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.createWithdrawalAccount
);

/**
 * @route PUT /api/h5/withdrawal/accounts/:id
 * @desc 更新提现账户
 * @access Private
 */
router.put(
  '/accounts/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    param('id').isInt().withMessage('无效的账户ID'),
    body('accountType')
      .isIn(Object.values(WithdrawalAccountType))
      .withMessage('无效的账户类型'),
    body('account')
      .notEmpty()
      .withMessage('账号不能为空')
      .isLength({ max: 100 })
      .withMessage('账号长度不能超过100个字符'),
    body('name')
      .notEmpty()
      .withMessage('姓名不能为空')
      .isLength({ max: 50 })
      .withMessage('姓名长度不能超过50个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.updateWithdrawalAccount
);

/**
 * @route GET /api/h5/withdrawal/accounts
 * @desc 获取提现账户列表
 * @access Private
 */
router.get(
  '/accounts',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  withdrawalController.getWithdrawalAccounts
);

/**
 * @route DELETE /api/h5/withdrawal/accounts/:id
 * @desc 删除提现账户
 * @access Private
 */
router.delete(
  '/accounts/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    param('id').isInt().withMessage('无效的账户ID')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.deleteWithdrawalAccount
);

/**
 * @route POST /api/h5/withdrawal
 * @desc 申请提现
 * @access Private
 */
router.post(
  '/',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('withdrawalAccountId')
      .isInt()
      .withMessage('无效的提现账户ID'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('提现金额必须大于0')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.createWithdrawal
);

/**
 * @route GET /api/h5/withdrawal
 * @desc 获取提现记录
 * @access Private
 */
router.get(
  '/',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('withdrawalStatus')
      .optional()
      .isIn(Object.values(WithdrawalStatus))
      .withMessage('无效的提现状态')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.getWithdrawals
);

module.exports = router; 