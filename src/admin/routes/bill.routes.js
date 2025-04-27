/*
 * @Author: diaochan
 * @Date: 2025-03-24 20:43:21
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-27 13:47:52
 * @Description: 
 */
/**
 * 账单相关路由
 * 处理账单相关的请求
 */
const express = require('express');
const { query } = require('express-validator');
const billController = require('../controllers/bill.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 应用中间件
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);
router.use(authMiddleware.hasPermission('finance:bills'));

/**
 * @route GET /api/admin/bills
 * @desc 获取账单列表
 * @access Private (Admin)
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
    query('memberNickname')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('billType')
      .optional(),
    query('settlementStatus')
      .optional()
      .isIn(['success', 'failed', 'pending'])
      .withMessage('common.validation.invalid'),
    query('taskName')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('startTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.mustBeISODate'),
    query('endTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.mustBeISODate'),
    query('relatedGroupId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  billController.list
);

module.exports = router; 