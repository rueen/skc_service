/**
 * 任务路由
 * 处理任务相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有任务路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/tasks
 * @desc 获取任务列表
 * @access Private (需要 task:list 权限)
 */
router.get(
  '/',
  authMiddleware.hasPermission('task:list'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('taskName')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('taskStatus')
      .optional()
      .isIn(['not_started', 'processing', 'ended'])
      .withMessage('common.validation.invalid'),
    query('channelId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('sorterField')
      .optional()
      .isIn(['startTime', 'endTime', 'createTime', 'updateTime', 'reward', 'taskName'])
      .withMessage('common.validation.invalid'),
    query('sorterOrder')
      .optional()
      .isIn(['ascend', 'descend'])
      .withMessage('common.validation.invalid'),
    query('taskIds')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (!Array.isArray(parsed)) {
              throw new Error('taskIds must be an array');
            }
            if (!parsed.every(id => Number.isInteger(Number(id)) && Number(id) > 0)) {
              throw new Error('taskIds must contain only positive integers');
            }
            return true;
          } catch (error) {
            throw new Error('taskIds must be a valid JSON array of positive integers');
          }
        }
        if (Array.isArray(value)) {
          if (!value.every(id => Number.isInteger(Number(id)) && Number(id) > 0)) {
            throw new Error('taskIds must contain only positive integers');
          }
          return true;
        }
        throw new Error('taskIds must be an array');
      })
      .withMessage('common.validation.invalid'),
    query('taskGroupId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('任务组ID必须是正整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.getList
);

/**
 * @route GET /api/admin/tasks/:id
 * @desc 获取任务详情
 * @access Private (需要 task:list 权限)
 */
router.get(
  '/:id',
  // authMiddleware.hasPermission('task:edit'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.getDetail
);

/**
 * @route POST /api/admin/tasks
 * @desc 创建任务
 * @access Private (需要 task:create 权限)
 */
router.post(
  '/',
  authMiddleware.hasPermission('task:create'),
  [
    body('taskName')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('channelId')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('category')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('taskType')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty'),
    body('reward')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isFloat({ min: 0 })
      .withMessage('common.validation.amountFormat'),
    body('brand')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('groupMode')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
    body('userRange')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isIn([0, 1])
      .withMessage('common.validation.invalid'),
    body('taskCount')
      .custom((value, { req }) => {
        // 当 userRange 为 1 时，taskCount 必须存在且为非负整数
        if (req.body.userRange === 1) {
          if (value === undefined || value === null) {
            throw new Error('当用户范围为1时，完成任务次数不能为空');
          }
          if (!Number.isInteger(Number(value)) || Number(value) < 0) {
            throw new Error('完成任务次数必须是非负整数');
          }
        }
        return true;
      }),
    body('customFields')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('startTime')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    body('endTime')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    body('unlimitedQuota')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
    body('fansRequired')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.formatInvalid'),
    body('contentRequirement')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('taskInfo')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('notice')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('taskStatus')
      .optional()
      .isIn(['not_started', 'processing', 'ended'])
      .withMessage('common.validation.invalid')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.create
);

/**
 * @route PUT /api/admin/tasks/:id
 * @desc 更新任务
 * @access Private (需要 task:edit 权限)
 */
router.put(
  '/:id',
  authMiddleware.hasPermission('task:edit'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('taskName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('channelId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('category')
      .optional()
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('taskType')
      .optional(),
    body('reward')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('common.validation.amountFormat'),
    body('brand')
      .optional()
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('groupMode')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
    body('userRange')
      .optional()
      .isIn([0, 1])
      .withMessage('common.validation.invalid'),
    body('taskCount')
      .optional()
      .custom((value, { req }) => {
        // 当 userRange 为 1 时，如果提供了 taskCount，必须为非负整数
        if (req.body.userRange === 1 && value !== undefined) {
          if (!Number.isInteger(Number(value)) || Number(value) < 0) {
            throw new Error('完成任务次数必须是非负整数');
          }
        }
        return true;
      }),
    body('customFields')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('startTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    body('endTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    body('unlimitedQuota')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
    body('fansRequired')
      .optional()
      .isInt({ min: 0 })
      .withMessage('common.validation.formatInvalid'),
    body('contentRequirement')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('taskInfo')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('notice')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('taskStatus')
      .optional()
      .isIn(['not_started', 'processing', 'ended'])
      .withMessage('common.validation.invalid')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.update
);

/**
 * @route DELETE /api/admin/tasks/:id
 * @desc 删除任务
 * @access Private (需要 task:edit 权限)
 */
router.delete(
  '/:id',
  authMiddleware.hasPermission('task:edit'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.remove
);

module.exports = router; 