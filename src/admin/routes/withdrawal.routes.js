/*
 * @Author: diaochan
 * @Date: 2025-03-26 16:57:36
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-07 15:12:45
 * @Description: 
 */
/**
 * Admin端提现路由
 * 处理提现相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const withdrawalController = require('../controllers/withdrawal.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const { WithdrawalStatus } = require('../../shared/config/enums');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 应用中间件
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);
router.use(authMiddleware.hasPermission('finance:withdrawal'));

/**
 * @route GET /api/admin/withdrawals
 * @desc 获取提现记录列表
 * @access Private (需要 finance:withdrawal 权限)
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
      .withMessage('common.validation.invalid'),
    query('memberId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('paymentChannelId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('startTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('endTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.getWithdrawals
);

/**
 * @route POST /api/admin/withdrawals/batch-approve
 * @desc 批量审核通过提现申请
 * @access Private (需要 finance:withdrawal 权限)
 */
router.post(
  '/batch-approve',
  [
    body('ids')
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('ids.*')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('remark')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.batchResolveWithdrawals
);

/**
 * @route POST /api/admin/withdrawals/batch-reject
 * @desc 批量拒绝提现申请
 * @access Private (需要 finance:withdrawal 权限)
 */
router.post(
  '/batch-reject',
  [
    body('ids').isArray().withMessage('common.validation.mustBeArray'),
    body('ids.*').isInt().withMessage('common.validation.mustBeInt'),
    body('rejectReason')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 255 })
      .withMessage('common.validation.maxLength{max:255}'),
    body('remark').optional().isString().withMessage('common.validation.mustBeString')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.batchRejectWithdrawals
);

/**
 * @route GET /api/admin/withdrawals/export
 * @desc 导出提现数据
 * @access Private (需要 finance:withdrawal 权限)
 */
router.get(
  '/export',
  [
    query('memberNickname').optional().isString().withMessage('common.validation.mustBeString'),
    query('withdrawalStatus')
      .optional()
      .isIn(Object.values(WithdrawalStatus))
      .withMessage('common.validation.invalid'),
    query('paymentChannelId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('billNo').optional().isString().withMessage('common.validation.mustBeString'),
    query('startTime').optional().isString().withMessage('common.validation.timeFormatInvalid'),
    query('endTime').optional().isString().withMessage('common.validation.timeFormatInvalid')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.exportWithdrawals
);

// 获取所有支付交易记录
router.get(
  '/payment-transactions',
  withdrawalController.getAllTransactions
);

module.exports = router; 