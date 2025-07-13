/**
 * H5端任务组路由
 * 处理任务组相关的路由
 */
const express = require('express');
const { param } = require('express-validator');
const taskGroupController = require('../controllers/task-group.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 应用认证和限流中间件
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/task-groups/:id
 * @desc 获取任务组详情
 * @access Private
 */
router.get(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt({ min: 1 })
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskGroupController.getDetail
);

/**
 * @route GET /api/h5/task-groups/:id/related-tasks
 * @desc 获取任务组已关联任务列表
 * @access Private
 */
router.get(
  '/:id/related-tasks',
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt({ min: 1 })
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskGroupController.getRelatedTasks
);

module.exports = router; 