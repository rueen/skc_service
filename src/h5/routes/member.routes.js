/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-19 14:09:26
 * @Description: 
 */
/**
 * H5端会员路由
 * 处理会员相关的路由
 */
const express = require('express');
const { body, param } = require('express-validator');
const memberController = require('../controllers/member.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route PUT /api/h5/members/profile
 * @desc 更新会员个人资料
 * @access Private
 */
router.put(
  '/profile',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('memberNickname')
      .optional()
      .isLength({ max: 20 })
      .withMessage('昵称长度不能超过20个字符'),
    body('occupation')
      .optional()
      .isIn(['housewife', 'freelancer', 'student'])
      .withMessage('职业类型无效')
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
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  memberController.getAccounts
);

/**
 * @route POST /api/h5/members/accounts
 * @desc 添加会员账号
 * @access Private
 */
router.post(
  '/accounts',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('channelId')
      .notEmpty()
      .withMessage('渠道ID不能为空')
      .isInt()
      .withMessage('渠道ID必须是整数'),
    body('account')
      .notEmpty()
      .withMessage('账号不能为空')
      .isLength({ max: 100 })
      .withMessage('账号长度不能超过100个字符'),
    body('homeUrl')
      .optional()
      .isURL()
      .withMessage('主页链接必须是有效的URL'),
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
      .withMessage('发布数量必须是非负整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.addAccount
);

/**
 * @route GET /api/h5/members/accounts/:id
 * @desc 获取会员账号详情
 * @access Private
 */
router.get(
  '/accounts/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    param('id')
      .notEmpty()
      .withMessage('账号ID不能为空')
      .isInt()
      .withMessage('账号ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getAccountDetail
);

/**
 * @route PUT /api/h5/members/accounts/:id
 * @desc 更新会员账号
 * @access Private
 */
router.put(
  '/accounts/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    param('id')
      .notEmpty()
      .withMessage('账号ID不能为空')
      .isInt()
      .withMessage('账号ID必须是整数'),
    body('account')
      .optional()
      .isLength({ max: 100 })
      .withMessage('账号长度不能超过100个字符'),
    body('homeUrl')
      .optional()
      .isURL()
      .withMessage('主页链接必须是有效的URL'),
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
      .withMessage('发布数量必须是非负整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.updateAccount
);

/**
 * @route DELETE /api/h5/members/accounts/:id
 * @desc 删除会员账号
 * @access Private
 */
router.delete(
  '/accounts/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    param('id')
      .notEmpty()
      .withMessage('账号ID不能为空')
      .isInt()
      .withMessage('账号ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.deleteAccount
);

/**
 * @route GET /api/h5/members/owned-groups
 * @desc 获取当前会员作为群主的群组列表
 * @access Private
 */
router.get(
  '/owned-groups',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  memberController.getOwnedGroups
);

module.exports = router; 