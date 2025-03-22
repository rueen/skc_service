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
 * @access Public (但如果用户已登录会返回更多信息)
 */
router.get(
  '/',
  authMiddleware.optionalToken, // 可选的Token验证，不强制要求用户登录
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
 * @route GET /api/h5/tasks/applications
 * @desc 获取已报名的任务列表
 * @access Private
 */
router.get(
  '/applications',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('status').optional().isIn(['applied', 'submitted', 'completed']).withMessage('状态值无效')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.getAppliedList
);

/**
 * @route GET /api/h5/tasks/:id
 * @desc 获取任务详情
 * @access Private
 */
router.get(
  '/:id',
  authMiddleware.verifyToken,
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
 * @route POST /api/h5/tasks/apply/:id
 * @desc 报名任务
 * @access Private
 */
router.post(
  '/apply/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    param('id')
      .notEmpty()
      .withMessage('任务ID不能为空')
      .isInt()
      .withMessage('任务ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.applyTask
);

/**
 * @route POST /api/h5/tasks/submit/:id
 * @desc 提交任务
 * @access Private
 */
router.post(
  '/submit/:id',
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
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.submitTask
);

module.exports = router; 