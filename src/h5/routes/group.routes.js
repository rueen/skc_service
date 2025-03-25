/*
 * @Author: diaochan
 * @Date: 2025-03-25 21:21:23
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-25 21:33:41
 * @Description: 
 */
/**
 * 群组路由
 * 处理H5端群组相关的路由
 */
const express = require('express');
const { query, param } = require('express-validator');
const groupController = require('../controllers/group.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware.verifyToken);

/**
 * @route GET /api/h5/members/groups
 * @desc 获取当前会员所属群列表
 * @access Private
 */
router.get(
  '/',
  rateLimiterMiddleware.apiLimiter,
  groupController.getMemberGroups
);

/**
 * @route GET /api/h5/members/groups/stats
 * @desc 获取群主名下群统计信息
 * @access Private
 */
router.get(
  '/stats',
  rateLimiterMiddleware.apiLimiter,
  groupController.getOwnerGroupStats
);

/**
 * @route GET /api/h5/members/groups/:groupId/members
 * @desc 获取群成员列表
 * @access Private
 */
router.get(
  '/:groupId/members',
  [
    param('groupId')
      .notEmpty()
      .withMessage('群组ID不能为空')
      .isInt()
      .withMessage('群组ID必须是整数'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是大于等于1的整数'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页条数必须是1-100之间的整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  rateLimiterMiddleware.apiLimiter,
  groupController.getGroupMembers
);

module.exports = router; 