/**
 * 群组路由
 * 处理群组相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const groupController = require('../controllers/group.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有群组路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/groups
 * @desc 获取群组列表
 * @access Private
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('groupName')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('ownerId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('memberId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('keyword')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.list
);

/**
 * @route GET /api/admin/groups/:id
 * @desc 获取群组详情
 * @access Private
 */
router.get(
  '/:id',
  authMiddleware.hasPermission('group:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.get
);

/**
 * @route POST /api/admin/groups
 * @desc 创建群组
 * @access Private
 */
router.post(
  '/',
  authMiddleware.hasPermission('group:list'),
  [
    body('groupName')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('groupLink')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isURL()
      .withMessage('common.validation.formatInvalid'),
    body('ownerId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.create
);

/**
 * @route PUT /api/admin/groups/:id
 * @desc 更新群组
 * @access Private
 */
router.put(
  '/:id',
  authMiddleware.hasPermission('group:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('groupName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('groupLink')
      .optional()
      .isURL()
      .withMessage('common.validation.formatInvalid'),
    body('ownerId')
      .optional()
      .custom((value) => {
        // 允许传入 null 或不传
        if (value === null || value === undefined) return true;
        // 如果传值了，必须是整数
        return Number.isInteger(Number(value));
      })
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.update
);

/**
 * @route DELETE /api/admin/groups/:id
 * @desc 删除群组
 * @access Private
 */
router.delete(
  '/:id',
  authMiddleware.hasPermission('group:list'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.remove
);

module.exports = router; 