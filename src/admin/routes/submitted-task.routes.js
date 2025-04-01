/*
 * @Author: diaochan
 * @Date: 2025-03-23 15:39:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-01 18:46:25
 * @Description: 
 */
/**
 * 已提交任务路由 - 管理后台
 * 处理任务审核相关路由配置
 */
const express = require('express');
const { query } = require('express-validator');
const submittedTaskController = require('../controllers/submitted-task.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const validatorUtil = require('../../shared/utils/validator.util');

const router = express.Router();

// 应用中间件
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/submitted-tasks
 * @desc 获取已提交任务列表
 * @access Private (需要 task:submitted 权限)
 */
router.get(
  '/',
  [
    query('submitStartTime')
      .optional()
      .isISO8601()
      .withMessage('提交开始时间格式不正确，应为ISO8601格式(如:2025-03-01T00:00:00Z)'),
    query('submitEndTime')
      .optional()
      .isISO8601()
      .withMessage('提交结束时间格式不正确，应为ISO8601格式(如:2025-03-31T23:59:59Z)'),
    query('completedTaskCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('已完成任务次数必须是非负整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.hasPermission('task:submitted'),
  submittedTaskController.getSubmittedTasks
);

/**
 * @route GET /api/admin/submitted-tasks/:id
 * @desc 获取已提交任务详情
 * @access Private (需要 task:submittedDetail 权限)
 */
router.get(
  '/:id',
  authMiddleware.hasPermission('task:submittedDetail'),
  submittedTaskController.getSubmittedTaskDetail
);

/**
 * @route POST /api/admin/submitted-tasks/batch-approve
 * @desc 批量审核通过
 * @access Private (需要 task:submitted 权限)
 */
router.post(
  '/batch-approve',
  authMiddleware.hasPermission('task:submitted'),
  submittedTaskController.batchApproveSubmissions
);

/**
 * @route POST /api/admin/submitted-tasks/batch-reject
 * @desc 批量拒绝
 * @access Private (需要 task:submitted 权限)
 */
router.post(
  '/batch-reject',
  authMiddleware.hasPermission('task:submitted'),
  submittedTaskController.batchRejectSubmissions
);

module.exports = router; 