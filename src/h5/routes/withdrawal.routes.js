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
const { WithdrawalStatus } = require('../../shared/config/enums');

const router = express.Router();
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route POST /api/h5/withdrawal/accounts
 * @desc 创建提现账户
 * @access Private
 */
router.post(
  '/accounts',
  [
    body('paymentChannelId')
      .notEmpty()
      .withMessage('支付渠道不能为空')
      .isInt()
      .withMessage('无效的支付渠道ID'),
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
  [
    param('id').isInt().withMessage('无效的账户ID'),
    body('paymentChannelId')
      .notEmpty()
      .withMessage('支付渠道不能为空')
      .isInt()
      .withMessage('无效的支付渠道ID'),
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
  withdrawalController.getWithdrawalAccounts
);

/**
 * @route DELETE /api/h5/withdrawal/accounts/:id
 * @desc 删除提现账户
 * @access Private
 */
router.delete(
  '/accounts/:id',
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
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('withdrawalStatus')
      .optional()
      .isIn(Object.values(WithdrawalStatus))
      .withMessage('无效的提现状态')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.getWithdrawals
);

module.exports = router; 