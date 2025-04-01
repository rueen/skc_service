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
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('taskName').optional().isString().withMessage('任务名称必须是字符串'),
    query('taskStatus').optional().isIn(['not_started', 'processing', 'ended']).withMessage('任务状态值无效'),
    query('channelId').optional().isInt().withMessage('渠道ID必须是整数')
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
  authMiddleware.hasPermission('task:edit'),
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
      .withMessage('任务名称不能为空')
      .isLength({ max: 100 })
      .withMessage('任务名称长度不能超过100个字符'),
    body('channelId')
      .notEmpty()
      .withMessage('渠道ID不能为空')
      .isInt()
      .withMessage('渠道ID必须是整数'),
    body('category')
      .notEmpty()
      .withMessage('任务类别不能为空')
      .isLength({ max: 50 })
      .withMessage('任务类别长度不能超过50个字符'),
    body('taskType')
      .notEmpty()
      .withMessage('任务类型不能为空')
      .isIn(['image_text', 'video'])
      .withMessage('任务类型值无效'),
    body('reward')
      .notEmpty()
      .withMessage('任务奖励金额不能为空')
      .isFloat({ min: 0 })
      .withMessage('任务奖励金额必须是非负数'),
    body('brand')
      .notEmpty()
      .withMessage('品牌名称不能为空')
      .isLength({ max: 100 })
      .withMessage('品牌名称长度不能超过100个字符'),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('群组ID列表必须是数组'),
    body('groupMode')
      .optional()
      .isBoolean()
      .withMessage('群组模式必须是布尔值'),
    body('userRange')
      .notEmpty()
      .withMessage('用户范围不能为空')
      .isIn([0, 1])
      .withMessage('用户范围必须是0或1，0表示全部用户，1表示需要校验完成任务次数'),
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
      .withMessage('自定义字段不能为空')
      .isArray()
      .withMessage('自定义字段必须是数组'),
    body('startTime')
      .notEmpty()
      .withMessage('开始时间不能为空')
      .isISO8601()
      .withMessage('开始时间格式无效'),
    body('endTime')
      .notEmpty()
      .withMessage('结束时间不能为空')
      .isISO8601()
      .withMessage('结束时间格式无效'),
    body('unlimitedQuota')
      .optional()
      .isBoolean()
      .withMessage('是否不限名额必须是布尔值'),
    body('fansRequired')
      .optional()
      .isInt({ min: 0 })
      .withMessage('粉丝要求必须是大于等于0的整数'),
    body('contentRequirement')
      .optional()
      .isString()
      .withMessage('内容要求必须是字符串'),
    body('taskInfo')
      .optional()
      .isString()
      .withMessage('任务说明必须是字符串'),
    body('notice')
      .optional()
      .isString()
      .withMessage('温馨提示必须是字符串'),
    body('taskStatus')
      .optional()
      .isIn(['not_started', 'processing', 'ended'])
      .withMessage('任务状态值无效')
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
      .withMessage('任务ID不能为空')
      .isInt()
      .withMessage('任务ID必须是整数'),
    body('taskName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('任务名称长度不能超过100个字符'),
    body('channelId')
      .optional()
      .isInt()
      .withMessage('渠道ID必须是整数'),
    body('category')
      .optional()
      .isLength({ max: 50 })
      .withMessage('任务类别长度不能超过50个字符'),
    body('taskType')
      .optional()
      .isIn(['image_text', 'video'])
      .withMessage('任务类型值无效'),
    body('reward')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('任务奖励金额必须是非负数'),
    body('brand')
      .optional()
      .isLength({ max: 100 })
      .withMessage('品牌名称长度不能超过100个字符'),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('群组ID列表必须是数组'),
    body('groupMode')
      .optional()
      .isBoolean()
      .withMessage('群组模式必须是布尔值'),
    body('userRange')
      .optional()
      .isIn([0, 1])
      .withMessage('用户范围必须是0或1，0表示全部用户，1表示需要校验完成任务次数'),
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
      .withMessage('自定义字段必须是数组'),
    body('startTime')
      .optional()
      .isISO8601()
      .withMessage('开始时间格式无效'),
    body('endTime')
      .optional()
      .isISO8601()
      .withMessage('结束时间格式无效'),
    body('unlimitedQuota')
      .optional()
      .isBoolean()
      .withMessage('是否不限名额必须是布尔值'),
    body('fansRequired')
      .optional()
      .isInt({ min: 0 })
      .withMessage('粉丝要求必须是大于等于0的整数'),
    body('contentRequirement')
      .optional()
      .isString()
      .withMessage('内容要求必须是字符串'),
    body('taskInfo')
      .optional()
      .isString()
      .withMessage('任务说明必须是字符串'),
    body('notice')
      .optional()
      .isString()
      .withMessage('温馨提示必须是字符串'),
    body('taskStatus')
      .optional()
      .isIn(['not_started', 'processing', 'ended'])
      .withMessage('任务状态值无效')
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
      .withMessage('任务ID不能为空')
      .isInt()
      .withMessage('任务ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  taskController.remove
);

module.exports = router; 