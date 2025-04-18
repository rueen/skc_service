/*
 * @Author: diaochan
 * @Date: 2025-03-25 16:57:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-30 16:20:09
 * @Description: 
 */
/**
 * H5端邀请路由
 * 处理邀请相关的路由
 */
const express = require('express');
const { query } = require('express-validator');
const inviteController = require('../controllers/invite.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/members/invite/stats
 * @desc 获取会员邀请数据统计
 * @access Private
 */
router.get(
  '/stats',
  inviteController.getInviteStats
);

/**
 * @route GET /api/h5/members/invite/friends
 * @desc 获取会员邀请好友列表
 * @access Private
 */
router.get(
  '/friends',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是大于0的整数'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须是1-100之间的整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  inviteController.getInviteFriends
);

module.exports = router; 