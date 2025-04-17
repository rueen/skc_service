/*
 * @Author: diaochan
 * @Date: 2025-03-20 10:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 15:58:35
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
    query('keyword')
      .optional()
      .isString()
      .withMessage('account.validation.keywordString'),
    query('account')
      .optional()
      .isString()
      .withMessage('account.validation.accountString'),
    query('channelId')
      .optional()
      .isInt()
      .withMessage('account.validation.channelIdInt'),
    query('accountAuditStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('account.validation.accountAuditStatusInvalid'),
    query('groupId')
      .optional()
      .isInt()
      .withMessage('account.validation.groupIdInt'),
    query('memberId')
      .optional()
      .isInt()
      .withMessage('account.validation.memberIdInt')
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
      .withMessage('account.validation.idsArray')
      .notEmpty()
      .withMessage('account.validation.idsNotEmpty')
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
      .withMessage('account.validation.idsArray')
      .notEmpty()
      .withMessage('account.validation.idsNotEmpty'),
    body('rejectReason')
      .notEmpty()
      .withMessage('account.validation.rejectReasonRequired')
      .isString()
      .withMessage('account.validation.rejectReasonString')
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
      .withMessage('account.validation.homeUrlInvalid'),
    body('uid')
      .optional()
      .isString()
      .withMessage('account.validation.uidString'),
    body('account')
      .optional()
      .isString()
      .withMessage('account.validation.accountString'),
    body('fansCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('account.validation.fansCountNonNegative'),
    body('friendsCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('account.validation.friendsCountNonNegative'),
    body('postsCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('account.validation.postsCountNonNegative')
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