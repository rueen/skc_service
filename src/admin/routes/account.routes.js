/*
 * @Author: diaochan
 * @Date: 2025-03-20 10:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 10:12:20
 * @Description: 
 */
/**
 * 账号管理路由
 * 处理管理端账号相关的路由
 */
const express = require('express');
const { body, query } = require('express-validator');
const accountController = require('../controllers/account.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 应用中间件
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);
router.use(authMiddleware.hasPermission('account:list'));

/**
 * @route GET /api/admin/accounts
 * @desc 获取账号列表
 * @access Private - Admin
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
    query('keyword')
      .optional()
      .isString()
      .withMessage('关键词必须是字符串'),
    query('account')
      .optional()
      .isString()
      .withMessage('账号必须是字符串'),
    query('channelId')
      .optional()
      .isInt()
      .withMessage('渠道ID必须是整数'),
    query('accountAuditStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('账号审核状态无效'),
    query('groupId')
      .optional()
      .isInt()
      .withMessage('群组ID必须是整数'),
    query('memberId')
      .optional()
      .isInt()
      .withMessage('会员ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  accountController.getAccounts
);

/**
 * @route POST /api/admin/accounts/batch-approve
 * @desc 批量审核通过账号
 * @access Private - Admin
 */
router.post(
  '/batch-approve',
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
 * @route POST /api/admin/accounts/batch-reject
 * @desc 批量审核拒绝账号
 * @access Private - Admin
 */
router.post(
  '/batch-reject',
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

/**
 * @route PUT /api/admin/accounts/:id
 * @desc 编辑会员社交媒体账号信息
 * @access Private - 仅需account:list权限
 */
router.put(
  '/:id',
  [
    body('homeUrl')
      .optional()
      .isURL()
      .withMessage('个人主页URL格式不正确'),
    body('uid')
      .optional()
      .isString()
      .withMessage('UID必须是字符串'),
    body('account')
      .optional()
      .isString()
      .withMessage('账号必须是字符串'),
    body('fansCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('粉丝数量必须是非负整数'),
    body('friendsCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('好友数量必须是非负整数'),
    body('postsCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('帖子数量必须是非负整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  accountController.editAccount
);

/**
 * @route GET /api/admin/accounts/:id
 * @desc 获取账号详情
 * @access Private - Admin
 */
router.get('/:id', authMiddleware.verifyToken, accountController.getAccountDetail);

/**
 * @route DELETE /api/admin/accounts/:id
 * @desc 删除账号
 * @access Private - Admin
 */
router.delete('/:id', authMiddleware.verifyToken, accountController.deleteAccount);

module.exports = router; 