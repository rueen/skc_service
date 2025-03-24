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
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('groupName').optional().isString().withMessage('群组名称必须是字符串'),
    query('ownerId').optional().isInt().withMessage('群主ID必须是整数'),
    query('memberId').optional().isInt().withMessage('成员ID必须是整数'),
    query('keyword').optional().isString().withMessage('关键词必须是字符串')
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
  [
    param('id')
      .notEmpty()
      .withMessage('群组ID不能为空')
      .isInt()
      .withMessage('群组ID必须是整数')
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
  [
    body('groupName')
      .notEmpty()
      .withMessage('群组名称不能为空')
      .isLength({ max: 50 })
      .withMessage('群组名称长度不能超过50个字符'),
    body('groupLink')
      .notEmpty()
      .withMessage('群组链接不能为空')
      .isURL()
      .withMessage('群组链接必须是有效的URL'),
    body('ownerId')
      .optional()
      .isInt()
      .withMessage('群主ID必须是整数')
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
  [
    param('id')
      .notEmpty()
      .withMessage('群组ID不能为空')
      .isInt()
      .withMessage('群组ID必须是整数'),
    body('groupName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('群组名称长度不能超过50个字符'),
    body('groupLink')
      .optional()
      .isURL()
      .withMessage('群组链接必须是有效的URL'),
    body('ownerId')
      .optional()
      .custom((value) => {
        // 允许传入 null 或不传
        if (value === null || value === undefined) return true;
        // 如果传值了，必须是整数
        return Number.isInteger(Number(value));
      })
      .withMessage('群主ID必须是整数')
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
  [
    param('id')
      .notEmpty()
      .withMessage('群组ID不能为空')
      .isInt()
      .withMessage('群组ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.remove
);

module.exports = router; 