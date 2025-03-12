/**
 * 渠道路由
 * 处理渠道相关的路由
 */
const express = require('express');
const { body, query } = require('express-validator');
const channelController = require('../controllers/channel.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../utils/validator.util');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/support/channels/list
 * @desc 获取渠道列表
 * @access Private
 */
router.get(
  '/list',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('keyword').optional().isString().withMessage('关键字必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.list
);

/**
 * @route GET /api/support/channels/:id
 * @desc 获取渠道详情
 * @access Private
 */
router.get(
  '/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  channelController.get
);

/**
 * @route POST /api/support/channels/add
 * @desc 添加渠道
 * @access Private
 */
router.post(
  '/add',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('channel_name')
      .notEmpty()
      .withMessage('渠道名称不能为空')
      .isLength({ max: 100 })
      .withMessage('渠道名称长度不能超过100个字符'),
    body('channel_desc')
      .optional()
      .isLength({ max: 500 })
      .withMessage('渠道描述长度不能超过500个字符'),
    body('channel_type')
      .notEmpty()
      .withMessage('渠道类型不能为空')
      .isLength({ max: 50 })
      .withMessage('渠道类型长度不能超过50个字符'),
    body('channel_config')
      .optional()
      .isObject()
      .withMessage('渠道配置必须是对象格式')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.add
);

/**
 * @route PUT /api/support/channels/:id
 * @desc 更新渠道
 * @access Private
 */
router.put(
  '/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('channel_name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('渠道名称长度不能超过100个字符'),
    body('channel_desc')
      .optional()
      .isLength({ max: 500 })
      .withMessage('渠道描述长度不能超过500个字符'),
    body('channel_type')
      .optional()
      .isLength({ max: 50 })
      .withMessage('渠道类型长度不能超过50个字符'),
    body('channel_config')
      .optional()
      .isObject()
      .withMessage('渠道配置必须是对象格式')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.edit
);

/**
 * @route DELETE /api/support/channels/:id
 * @desc 删除渠道
 * @access Private
 */
router.delete(
  '/:id',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  channelController.remove
);

module.exports = router; 