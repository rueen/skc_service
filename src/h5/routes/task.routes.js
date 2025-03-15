/**
 * H5端任务路由
 * 处理任务相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/h5/tasks
 * @desc 获取任务列表
 * @access Public
 */
router.get(
  '/',
  rateLimiterMiddleware.apiLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('channelId').optional().isInt().withMessage('渠道ID必须是整数'),
    query('category').optional().isString().withMessage('任务类别必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.getList
);

/**
 * @route GET /api/h5/tasks/:id
 * @desc 获取任务详情
 * @access Public
 */
router.get(
  '/:id',
  rateLimiterMiddleware.apiLimiter,
  [
    param('id')
      .notEmpty()
      .withMessage('任务ID不能为空')
      .isInt()
      .withMessage('任务ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.getDetail
);

/**
 * @route POST /api/h5/tasks/:id/submit
 * @desc 提交任务
 * @access Private
 */
router.post(
  '/:id/submit',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    param('id')
      .notEmpty()
      .withMessage('任务ID不能为空')
      .isInt()
      .withMessage('任务ID必须是整数'),
    body('submitContent')
      .notEmpty()
      .withMessage('提交内容不能为空')
      .isArray()
      .withMessage('提交内容必须是数组')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.submitTask
);

/**
 * @route GET /api/h5/tasks/submitted
 * @desc 获取已提交的任务列表
 * @access Private
 */
router.get(
  '/submitted',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('taskAuditStatus').optional().isIn(['pending', 'approved', 'rejected']).withMessage('审核状态值无效')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.getSubmittedList
);

module.exports = router; 