/**
 * 任务组路由
 * 处理任务组相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const taskGroupController = require('../controllers/task-group.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');

const router = express.Router();

// 所有任务组路由都需要认证
router.use(authMiddleware.verifyToken);

/**
 * @route GET /api/admin/task-groups
 * @desc 获取任务组列表
 * @access Private (需要 task:group 权限)
 */
router.get(
  '/',
  authMiddleware.hasPermission('task:group'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('taskGroupName')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('taskName')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('sorterField')
      .optional()
      .isIn(['createTime', 'updateTime'])
      .withMessage('排序字段只能是 createTime 或 updateTime'),
    query('sorterOrder')
      .optional()
      .isIn(['ascend', 'descend'])
      .withMessage('排序方式只能是 ascend 或 descend')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskGroupController.getList
);

/**
 * @route GET /api/admin/task-groups/:id
 * @desc 获取任务组详情
 * @access Private (需要 task:group 权限)
 */
router.get(
  '/:id',
  authMiddleware.hasPermission('task:group'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskGroupController.getDetail
);

/**
 * @route POST /api/admin/task-groups
 * @desc 创建任务组
 * @access Private (需要 task:group 权限)
 */
router.post(
  '/',
  authMiddleware.hasPermission('task:group'),
  [
    body('taskGroupName')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('taskGroupReward')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isFloat({ min: 0 })
      .withMessage('common.validation.amountFormat'),
    body('relatedTasks')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray')
      .custom((value) => {
        if (Array.isArray(value)) {
          for (const taskId of value) {
            if (!Number.isInteger(Number(taskId)) || Number(taskId) <= 0) {
              throw new Error('关联任务ID必须是正整数');
            }
          }
        }
        return true;
      })
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskGroupController.create
);

/**
 * @route PUT /api/admin/task-groups/:id
 * @desc 更新任务组
 * @access Private (需要 task:group 权限)
 */
router.put(
  '/:id',
  authMiddleware.hasPermission('task:group'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('taskGroupName')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('taskGroupReward')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isFloat({ min: 0 })
      .withMessage('common.validation.amountFormat'),
    body('relatedTasks')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray')
      .custom((value) => {
        if (Array.isArray(value)) {
          for (const taskId of value) {
            if (!Number.isInteger(Number(taskId)) || Number(taskId) <= 0) {
              throw new Error('关联任务ID必须是正整数');
            }
          }
        }
        return true;
      })
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskGroupController.update
);

/**
 * @route DELETE /api/admin/task-groups/:id
 * @desc 删除任务组
 * @access Private (需要 task:group 权限)
 */
router.delete(
  '/:id',
  authMiddleware.hasPermission('task:group'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskGroupController.remove
);

module.exports = router; 