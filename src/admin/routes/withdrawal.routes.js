/*
 * @Author: diaochan
 * @Date: 2025-03-26 16:57:36
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:34:08
 * @Description: 
 */
/**
 * Admin端提现路由
 * 处理提现相关的路由
 */
const express = require('express');
const { body, query } = require('express-validator');
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
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
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
 * @route PUT /api/admin/withdrawal/batchResolve
 * @desc 批量审核通过提现申请
 * @access Private (需要 finance:withdrawal 权限)
 */
router.put(
  '/batchResolve',
  [
    body('ids').isArray().withMessage('ids必须是数组'),
    body('ids.*').isInt().withMessage('提现ID必须是整数'),
    body('remark').optional().isString().withMessage('备注必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  withdrawalController.batchResolveWithdrawals
);

/**
 * @route PUT /api/admin/withdrawal/batchReject
 * @desc 批量拒绝提现申请
 * @access Private (需要 finance:withdrawal 权限)
 */
router.put(
  '/batchReject',
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

module.exports = router; 