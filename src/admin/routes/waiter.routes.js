/**
 * 小二路由
 * 处理小二管理相关的路由
 */
const express = require('express');
const { body, param } = require('express-validator');
const waiterController = require('../controllers/waiter.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有小二路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/waiters
 * @desc 获取小二列表
 * @access Private (需要 waiter:list 权限)
 */
router.get(
  '/',
  authMiddleware.hasPermission('waiter:list'),
  waiterController.getList
);

/**
 * @route POST /api/admin/waiters
 * @desc 创建小二
 * @access Private (需要管理员权限)
 */
router.post(
  '/',
  authMiddleware.isAdmin,
  [
    body('username')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ min: 3, max: 20 })
      .withMessage('common.validation.waiterUsernameLength'),
    body('password')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ min: 6 })
      .withMessage('common.validation.minLength{min:6}'),
    body('isAdmin')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
    body('permissions')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
  ],
  (req, res, next) => {
    // 验证请求参数
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  waiterController.create
);

/**
 * @route PUT /api/admin/waiters/:id
 * @desc 更新小二信息
 * @access Private (需要管理员权限)
 */
router.put(
  '/:id',
  authMiddleware.isAdmin,
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('username')
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage('common.validation.waiterUsernameLength'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('common.validation.minLength{min:6}'),
    body('isAdmin')
      .optional()
      .isBoolean()
      .withMessage('common.validation.formatInvalid'),
    body('permissions')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
  ],
  (req, res, next) => {
    // 验证请求参数
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  waiterController.update
);

/**
 * @route DELETE /api/admin/waiters/:id
 * @desc 删除小二
 * @access Private (需要管理员权限)
 */
router.delete(
  '/:id',
  authMiddleware.isAdmin,
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
  ],
  (req, res, next) => {
    // 验证请求参数
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  waiterController.remove
);

module.exports = router; 