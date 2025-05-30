/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-19 20:20:29
 * @Description: 
 */
/**
 * H5端会员路由
 * 处理会员相关的路由
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const memberController = require('../controllers/member.controller');
const memberAccountController = require('../controllers/member-account.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route PUT /api/h5/members/profile
 * @desc 更新会员个人资料
 * @access Private
 */
router.put(
  '/profile',
  [
    body('memberNickname')
      .optional()
      .isLength({ max: 20 })
      .withMessage('common.validation.maxLength{max:20}'),
    body('occupation')
      .optional()
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.updateProfile
);

/**
 * @route GET /api/h5/members/accounts
 * @desc 获取会员账号列表
 * @access Private
 */
router.get(
  '/accounts',
  memberAccountController.getAccounts
);

/**
 * @route POST /api/h5/members/accounts/find-uid-by-home-url
 * @desc 根据主页链接查找UID
 * @access Private
 */
router.post(
  '/accounts/find-uid-by-home-url',
  [
    body('homeUrl')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isURL()
      .withMessage('common.validation.formatInvalid')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberAccountController.findUidByHomeUrl
);

/**
 * @route POST /api/h5/members/accounts
 * @desc 添加会员账号
 * @access Private
 */
router.post(
  '/accounts',
  [
    body('channelId')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('account')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('uid')
      .optional()
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('homeUrl')
      .optional()
      .isURL()
      .withMessage('common.validation.formatInvalid'),
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
  memberAccountController.addAccount
);

/**
 * @route GET /api/h5/members/accounts/:id
 * @desc 获取会员账号详情
 * @access Private
 */
router.get(
  '/accounts/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberAccountController.getAccountDetail
);

/**
 * @route PUT /api/h5/members/accounts/:id
 * @desc 更新会员账号
 * @access Private
 */
router.put(
  '/accounts/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('account')
      .optional()
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('uid')
      .optional()
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('homeUrl')
      .optional()
      .isURL()
      .withMessage('common.validation.formatInvalid'),
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
  memberAccountController.updateAccount
);

/**
 * @route DELETE /api/h5/members/accounts/:id
 * @desc 删除会员账号
 * @access Private
 */
router.delete(
  '/accounts/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberAccountController.deleteAccount
);

/**
 * @route GET /api/h5/members/balance
 * @desc 获取会员账户余额
 * @access Private
 */
router.get(
  '/balance',
  memberController.getBalance
);

/**
 * @route GET /api/h5/members/bills
 * @desc 获取会员账单列表
 * @access Private
 */
router.get(
  '/bills',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('billType')
      .optional()
      .isIn(['withdrawal', 'task_reward', 'invite_reward', 'group_owner_commission'])
      .withMessage('common.validation.invalid'),
    query('settlementStatus')
      .optional()
      .isIn(['success', 'failed', 'pending'])
      .withMessage('common.validation.invalid')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getBills
);

module.exports = router; 