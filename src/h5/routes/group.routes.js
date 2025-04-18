/*
 * @Author: diaochan
 * @Date: 2025-03-25 21:21:23
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 16:04:25
 * @Description: 
 */
/**
 * 群组路由
 * 处理H5端群组相关的路由
 */
const express = require('express');
const { query, param } = require('express-validator');
const groupController = require('../controllers/group.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/members/groups
 * @desc 获取当前会员所属群列表
 * @access Private
 */
router.get(
  '/',
  groupController.getMemberGroups
);

/**
 * @route GET /api/h5/members/groups/stats
 * @desc 获取群主名下群统计信息
 * @access Private
 */
router.get(
  '/stats',
  groupController.getOwnerGroupStats
);

/**
 * @route GET /api/h5/members/groups/commission-tasks
 * @desc 获取为群主带来收益的任务列表
 * @access Private
 */
router.get(
  '/commission-tasks',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('startDate')
      .optional()
      .isDate()
      .withMessage('开始日期格式必须为YYYY-MM-DD'),
    query('endDate')
      .optional()
      .isDate()
      .withMessage('结束日期格式必须为YYYY-MM-DD')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.getOwnerCommissionTasks
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
      query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.getGroupMembers
);

module.exports = router; 