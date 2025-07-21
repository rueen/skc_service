/**
 * 管理端站内信路由
 * 处理站内信管理相关的路由
 */
const express = require('express');
const { body, param, query } = require('express-validator');
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');

const router = express.Router();

// 所有站内信路由都需要认证和权限验证
router.use(authMiddleware.verifyToken);

/**
 * @route GET /api/admin/messages
 * @desc 获取站内信列表
 * @access Private (需要 messages:list 权限)
 */
router.get(
  '/',
  authMiddleware.hasPermission('messages:list'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.mustBePositiveInt'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('common.validation.pageSizeRange'),
    query('title')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('status')
      .optional()
      .isIn(['not_started', 'processing', 'ended'])
      .withMessage('common.validation.invalid'),
    query('sortField')
      .optional()
      .isIn(['startTime', 'endTime', 'updateTime', 'createTime'])
      .withMessage('common.validation.invalid'),
    query('sortOrder')
      .optional()
      .isIn(['ascend', 'descend'])
      .withMessage('common.validation.invalid')
  ],
  (req, res, next) => {
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  messageController.getList
);

/**
 * @route GET /api/admin/messages/:id
 * @desc 获取站内信详情
 * @access Private (需要 messages:list 权限)
 */
router.get(
  '/:id',
  authMiddleware.hasPermission('messages:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt({ min: 1 })
      .withMessage('common.validation.mustBePositiveInt')
  ],
  (req, res, next) => {
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  messageController.getById
);

/**
 * @route POST /api/admin/messages
 * @desc 创建站内信
 * @access Private (需要 messages:list 权限)
 */
router.post(
  '/',
  authMiddleware.hasPermission('messages:list'),
  [
    body('title')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 200 })
      .withMessage('common.validation.maxLength{max:200}'),
    body('content')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('startTime')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    body('endTime')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid')
  ],
  (req, res, next) => {
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  messageController.create
);

/**
 * @route PUT /api/admin/messages/:id
 * @desc 更新站内信
 * @access Private (需要 messages:list 权限)
 */
router.put(
  '/:id',
  authMiddleware.hasPermission('messages:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt({ min: 1 })
      .withMessage('common.validation.mustBePositiveInt'),
    body('title')
      .optional()
      .isLength({ max: 200 })
      .withMessage('common.validation.maxLength{max:200}'),
    body('content')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('startTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid'),
    body('endTime')
      .optional()
      .isISO8601()
      .withMessage('common.validation.timeFormatInvalid')
  ],
  (req, res, next) => {
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  messageController.update
);

/**
 * @route DELETE /api/admin/messages/:id
 * @desc 删除站内信
 * @access Private (需要 messages:list 权限)
 */
router.delete(
  '/:id',
  authMiddleware.hasPermission('messages:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt({ min: 1 })
      .withMessage('common.validation.mustBePositiveInt')
  ],
  (req, res, next) => {
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  messageController.remove
);

module.exports = router; 