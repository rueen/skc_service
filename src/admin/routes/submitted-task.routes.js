/*
 * @Author: diaochan
 * @Date: 2025-03-23 15:39:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-24 16:55:06
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
 * @route GET /api/admin/submitted-tasks/pre-audit
 * @desc 获取初审任务列表
 * @access Private (需要 task:preAudit 权限)
 */
router.get(
  '/pre-audit',
  [
    query('submitStartTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('submitEndTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('completedTaskCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.mustBeNonNegativeInteger'),
    query('taskPreAuditStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('common.validation.invalid'),
    query('preWaiterId')
      .optional()
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.hasPermission('task:preAudit'),
  submittedTaskController.getPreAuditTasks
);

/**
 * @route GET /api/admin/submitted-tasks/confirm-audit
 * @desc 获取复审任务列表
 * @access Private (需要 task:confirmAudit 权限)
 */
router.get(
  '/confirm-audit',
  [
    query('submitStartTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('submitEndTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('completedTaskCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.mustBeNonNegativeInteger')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.hasPermission('task:confirmAudit'),
  submittedTaskController.getConfirmAuditTasks
);

/**
 * @route GET /api/admin/submitted-tasks/pre-audit/export
 * @desc 导出初审任务列表
 * @access Private (需要 task:preAudit 权限)
 */
router.get(
  '/pre-audit/export',
  [
    query('submitStartTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('submitEndTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('completedTaskCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.mustBeNonNegativeInteger'),
    query('taskPreAuditStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage('common.validation.invalid'),
    query('preWaiterId')
      .optional()
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.hasPermission('task:preAudit'),
  submittedTaskController.exportPreAuditTasks
);

/**
 * @route GET /api/admin/submitted-tasks/confirm-audit/export
 * @desc 导出复审任务列表
 * @access Private (需要 task:confirmAudit 权限)
 */
router.get(
  '/confirm-audit/export',
  [
    query('submitStartTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('submitEndTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    query('completedTaskCount')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.mustBeNonNegativeInteger')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.hasPermission('task:confirmAudit'),
  submittedTaskController.exportConfirmAuditTasks
);

/**
 * @route GET /api/admin/submitted-tasks/:id
 * @desc 获取已提交任务详情
 * @access Private (需要 task:submittedDetail 权限)
 */
router.get(
  '/:id',
  [
    query('auditType')
      .optional()
      .isIn(['confirm', 'pre'])
      .withMessage('common.validation.invalid')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.hasPermission('task:submittedDetail'),
  submittedTaskController.getSubmittedTaskDetail
);

/**
 * @route POST /api/admin/submitted-tasks/confirm-audit/batch-approve
 * @desc 批量复审通过
 * @access Private (需要 task:confirmAudit 权限)
 */
router.post(
  '/confirm-audit/batch-approve',
  authMiddleware.hasPermission('task:confirmAudit'),
  submittedTaskController.batchApproveSubmissions
);

/**
 * @route POST /api/admin/submitted-tasks/confirm-audit/batch-reject
 * @desc 批量复审拒绝
 * @access Private (需要 task:confirmAudit 权限)
 */
router.post(
  '/confirm-audit/batch-reject',
  authMiddleware.hasPermission('task:confirmAudit'),
  submittedTaskController.batchRejectSubmissions
);

/**
 * @route POST /api/admin/submitted-tasks/pre-audit/batch-approve
 * @desc 批量预审通过
 * @access Private (需要 task:preAudit 权限)
 */
router.post(
  '/pre-audit/batch-approve',
  authMiddleware.hasPermission('task:preAudit'),
  submittedTaskController.batchPreApproveSubmissions
);

/**
 * @route POST /api/admin/submitted-tasks/pre-audit/batch-reject
 * @desc 批量预审拒绝
 * @access Private (需要 task:preAudit 权限)
 */
router.post(
  '/pre-audit/batch-reject',
  authMiddleware.hasPermission('task:preAudit'),
  submittedTaskController.batchPreRejectSubmissions
);

module.exports = router; 