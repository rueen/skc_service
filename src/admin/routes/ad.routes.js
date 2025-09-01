/**
 * 管理端广告路由
 * 处理广告相关的路由配置
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const adController = require('../controllers/ad.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 需要先验证管理员身份
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/ads
 * @desc 获取广告列表
 * @access Private (权限：ad:list)
 */
router.get(
  '/',
  authMiddleware.hasPermission('ad:list'),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是大于0的整数'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页条数必须是1-100之间的整数'),
    query('title')
      .optional()
      .isString()
      .withMessage('标题必须是字符串'),
    query('status')
      .optional()
      .isIn(['not_started', 'processing', 'ended'])
      .withMessage('状态必须是not_started、processing或ended'),
    query('location')
      .optional()
      .isString()
      .withMessage('位置必须是字符串'),
    query('sorterField')
      .optional()
      .isIn(['startTime', 'endTime', 'createTime', 'updateTime'])
      .withMessage('排序字段必须是startTime、endTime、createTime或updateTime'),
    query('sorterOrder')
      .optional()
      .isIn(['ascend', 'descend'])
      .withMessage('排序方向必须是ascend或descend')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  adController.getList
);

/**
 * @route GET /api/admin/ads/:id
 * @desc 获取广告详情
 * @access Private (权限：ad:list)
 */
router.get(
  '/:id',
  authMiddleware.hasPermission('ad:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('广告ID不能为空')
      .isInt({ min: 1 })
      .withMessage('广告ID必须是大于0的整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  adController.getDetail
);

/**
 * @route POST /api/admin/ads
 * @desc 创建广告
 * @access Private (权限：ad:list)
 */
router.post(
  '/',
  authMiddleware.hasPermission('ad:list'),
  [
    body('title')
      .notEmpty()
      .withMessage('广告标题不能为空')
      .isLength({ max: 200 })
      .withMessage('广告标题不能超过200个字符'),
    body('location')
      .notEmpty()
      .withMessage('广告位置不能为空')
      .isString()
      .withMessage('广告位置必须是字符串'),
    body('startTime')
      .notEmpty()
      .withMessage('开始时间不能为空')
      .isISO8601()
      .withMessage('开始时间格式不正确'),
    body('endTime')
      .notEmpty()
      .withMessage('结束时间不能为空')
      .isISO8601()
      .withMessage('结束时间格式不正确'),
    body('content')
      .optional()
      .custom((value) => {
        if (value && typeof value !== 'object') {
          throw new Error('内容必须是对象格式');
        }
        return true;
      }),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('groupMode')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  adController.create
);

/**
 * @route PUT /api/admin/ads/:id
 * @desc 更新广告
 * @access Private (权限：ad:list)
 */
router.put(
  '/:id',
  authMiddleware.hasPermission('ad:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('广告ID不能为空')
      .isInt({ min: 1 })
      .withMessage('广告ID必须是大于0的整数'),
    body('title')
      .optional()
      .isLength({ max: 200 })
      .withMessage('广告标题不能超过200个字符'),
    body('location')
      .optional()
      .isString()
      .withMessage('广告位置必须是字符串'),
    body('startTime')
      .optional()
      .isISO8601()
      .withMessage('开始时间格式不正确'),
    body('endTime')
      .optional()
      .isISO8601()
      .withMessage('结束时间格式不正确'),
    body('content')
      .optional()
      .custom((value) => {
        if (value && typeof value !== 'object') {
          throw new Error('内容必须是对象格式');
        }
        return true;
      }),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('groupMode')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  adController.update
);

/**
 * @route DELETE /api/admin/ads/:id
 * @desc 删除广告
 * @access Private (权限：ad:list)
 */
router.delete(
  '/:id',
  authMiddleware.hasPermission('ad:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('广告ID不能为空')
      .isInt({ min: 1 })
      .withMessage('广告ID必须是大于0的整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  adController.remove
);

module.exports = router; 