/*
 * @Author: diaochan
 * @Date: 2025-03-20 10:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 16:12:50
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
      .withMessage('common.validation.mustBeString'),
    query('account')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('channelId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('accountAuditStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('common.validation.invalid'),
    query('groupId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('memberId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt')
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
      .withMessage('common.validation.mustBeArray')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
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
      .withMessage('common.validation.mustBeArray')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty'),
    body('rejectReason')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
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
      .withMessage('common.validation.formatInvalid'),
    body('uid')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('account')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('fansCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.mustBeNonNegativeInteger'),
    body('friendsCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.mustBeNonNegativeInteger'),
    body('postsCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.mustBeNonNegativeInteger')
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