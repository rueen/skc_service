/*
 * @Author: diaochan
 * @Date: 2025-03-23 15:39:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-01 16:46:41
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

// 获取已提交任务列表
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
      .withMessage('提交结束时间格式不正确，应为ISO8601格式(如:2025-03-31T23:59:59Z)')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.hasPermission('task:submitted'),
  submittedTaskController.getSubmittedTasks
);

// 获取已提交任务详情
router.get(
  '/:id',
  authMiddleware.hasPermission('task:submittedDetail'),
  submittedTaskController.getSubmittedTaskDetail
);

// 批量审核通过
router.post(
  '/batch-approve',
  authMiddleware.hasPermission('task:submitted'),
  submittedTaskController.batchApproveSubmissions
);

// 批量拒绝
router.post(
  '/batch-reject',
  authMiddleware.hasPermission('task:submitted'),
  submittedTaskController.batchRejectSubmissions
);

module.exports = router; 