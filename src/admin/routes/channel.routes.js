/**
 * 渠道路由
 * 处理渠道相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const channelController = require('../controllers/channel.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有任务路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/channels
 * @desc 获取渠道列表
 * @access Private
 */
router.get(
  '/',
  [
    query('keyword')
      .optional()
      .isString()
      .withMessage('channel.validation.keywordString')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.list
);

/**
 * @route GET /api/admin/channels/:id
 * @desc 获取渠道详情
 * @access Private
 */
router.get(
  '/:id',
  authMiddleware.hasPermission('channel:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('channel.validation.idNotEmpty')
      .isInt()
      .withMessage('channel.validation.idInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.get
);

/**
 * @route POST /api/admin/channels
 * @desc 添加渠道
 * @access Private
 */
router.post(
  '/',
  authMiddleware.hasPermission('channel:list'),
  [
    body('name')
      .notEmpty()
      .withMessage('channel.validation.nameNotEmpty')
      .isLength({ max: 50 })
      .withMessage('channel.validation.nameLength'),
    body('icon')
      .notEmpty()
      .withMessage('channel.validation.iconNotEmpty'),
    body('customFields')
      .optional()
      .isArray()
      .withMessage('channel.validation.customFieldsArray')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.add
);

/**
 * @route PUT /api/admin/channels/:id
 * @desc 更新渠道
 * @access Private
 */
router.put(
  '/:id',
  authMiddleware.hasPermission('channel:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('channel.validation.idNotEmpty')
      .isInt()
      .withMessage('channel.validation.idInt'),
    body('name')
      .optional()
      .isLength({ max: 50 })
      .withMessage('channel.validation.nameLength'),
    body('icon')
      .optional()
      .notEmpty()
      .withMessage('channel.validation.iconNotEmpty'),
    body('customFields')
      .optional()
      .isArray()
      .withMessage('channel.validation.customFieldsArray')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.edit
);

/**
 * @route DELETE /api/admin/channels/:id
 * @desc 删除渠道
 * @access Private
 */
router.delete(
  '/:id',
  authMiddleware.hasPermission('channel:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('channel.validation.idNotEmpty')
      .isInt()
      .withMessage('channel.validation.idInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.remove
);

module.exports = router; 