/*
 * @Author: diaochan
 * @Date: 2025-03-24 20:43:21
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 09:20:01
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
      .withMessage('页码必须是大于0的整数'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('每页条数必须是大于0的整数'),
    query('memberNickname')
      .optional()
      .isString()
      .withMessage('会员昵称必须是字符串'),
    query('billType')
      .optional()
      .isIn(['withdrawal', 'task_reward', 'invite_reward', 'group_owner_commission'])
      .withMessage('账单类型无效'),
    query('settlementStatus')
      .optional()
      .isIn(['success', 'failed', 'pending'])
      .withMessage('结算状态无效')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  billController.list
);

module.exports = router; 