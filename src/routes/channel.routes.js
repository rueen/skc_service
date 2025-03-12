/**
 * 渠道路由
 * 处理渠道相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const channelController = require('../controllers/channel.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../utils/validator.util');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/support/channels
 * @desc 获取渠道列表
 * @access Private
 */
router.get(
  '/',
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
  [
    param('id')
      .notEmpty()
      .withMessage('渠道ID不能为空')
      .isInt()
      .withMessage('渠道ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.get
);

/**
 * @route POST /api/support/channels
 * @desc 添加渠道
 * @access Private
 */
router.post(
  '/',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('name')
      .notEmpty()
      .withMessage('渠道名称不能为空')
      .isLength({ max: 50 })
      .withMessage('渠道名称长度不能超过50个字符'),
    body('icon')
      .notEmpty()
      .withMessage('渠道图标不能为空')
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
    param('id')
      .notEmpty()
      .withMessage('渠道ID不能为空')
      .isInt()
      .withMessage('渠道ID必须是整数'),
    body('name')
      .optional()
      .isLength({ max: 50 })
      .withMessage('渠道名称长度不能超过50个字符'),
    body('icon')
      .optional()
      .notEmpty()
      .withMessage('渠道图标不能为空')
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
  [
    param('id')
      .notEmpty()
      .withMessage('渠道ID不能为空')
      .isInt()
      .withMessage('渠道ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  channelController.remove
);

module.exports = router; 