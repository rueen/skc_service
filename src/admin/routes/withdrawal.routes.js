/*
 * @Author: diaochan
 * @Date: 2025-03-26 16:57:36
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 10:55:33
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
    query('withdrawalStatus')
      .optional()
      .isIn(Object.values(WithdrawalStatus))
      .withMessage('无效的提现状态'),
    query('memberId').optional().isInt().withMessage('会员ID必须是整数'),
    query('startTime').optional().isISO8601().withMessage('开始时间格式不正确'),
    query('endTime').optional().isISO8601().withMessage('结束时间格式不正确')
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
    body('ids').isArray().withMessage('ids必须是数组'),
    body('ids.*').isInt().withMessage('提现ID必须是整数'),
    body('remark').optional().isString().withMessage('备注必须是字符串')
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
    body('ids').isArray().withMessage('ids必须是数组'),
    body('ids.*').isInt().withMessage('提现ID必须是整数'),
    body('rejectReason')
      .notEmpty()
      .withMessage('拒绝原因不能为空')
      .isLength({ max: 255 })
      .withMessage('拒绝原因长度不能超过255个字符'),
    body('remark').optional().isString().withMessage('备注必须是字符串')
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
    query('memberNickname').optional().isString().withMessage('会员昵称必须是字符串'),
    query('withdrawalStatus')
      .optional()
      .isIn(Object.values(WithdrawalStatus))
      .withMessage('无效的提现状态'),
    query('billNo').optional().isString().withMessage('账单编号必须是字符串'),
    query('startDate').optional().isString().withMessage('开始日期格式不正确'),
    query('endDate').optional().isString().withMessage('结束日期格式不正确')
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