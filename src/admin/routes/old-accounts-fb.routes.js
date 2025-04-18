/**
 * FB老账号管理路由
 */
const express = require('express');
const oldAccountsFbController = require('../controllers/old-accounts-fb.controller');
const validatorUtil = require('../../shared/utils/validator.util');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// 所有会员路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);
// 所有接口都需要account:list权限
router.use(authMiddleware.hasPermission('account:list'));

/**
 * @route GET /api/admin/old-accounts-fb
 * @desc 获取FB老账号列表
 * @access Private - Account List
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
    query('keyword')
      .optional()
      .isString()
      .withMessage('关键词必须是字符串'),
    query('memberId')
      .optional()
      .isInt()
      .withMessage('会员ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  oldAccountsFbController.getOldAccountsFb
);

/**
 * @route POST /api/admin/old-accounts-fb/import
 * @desc 导入FB老账号
 * @access Private - Account List
 */
router.post(
  '/import',
  [
    upload.single('file')
  ],
  oldAccountsFbController.importOldAccountsFb
);

/**
 * @route POST /api/admin/old-accounts-fb
 * @desc 添加FB老账号
 * @access Private - Account List
 */
router.post(
  '/',
  [
    body('uid')
      .notEmpty()
      .withMessage('FB账户不能为空')
      .isString()
      .withMessage('FB账户必须是字符串'),
    body('nickname')
      .notEmpty()
      .withMessage('FB昵称不能为空')
      .isString()
      .withMessage('FB昵称必须是字符串'),
    body('homeUrl')
      .optional()
      .isString()
      .withMessage('FB链接必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  oldAccountsFbController.addOldAccountFb
);

/**
 * @route PUT /api/admin/old-accounts-fb/:id
 * @desc 修改FB老账号
 * @access Private - Account List
 */
router.put(
  '/:id',
  [
    param('id')
      .isInt()
      .withMessage('ID必须是整数'),
    body('uid')
      .notEmpty()
      .withMessage('FB账户不能为空')
      .isString()
      .withMessage('FB账户必须是字符串'),
    body('nickname')
      .notEmpty()
      .withMessage('FB昵称不能为空')
      .isString()
      .withMessage('FB昵称必须是字符串'),
    body('homeUrl')
      .optional()
      .isString()
      .withMessage('FB链接必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  oldAccountsFbController.updateOldAccountFb
);

/**
 * @route DELETE /api/admin/old-accounts-fb/:id
 * @desc 删除FB老账号
 * @access Private - Account List
 */
router.delete(
  '/:id',
  [
    param('id')
      .isInt()
      .withMessage('ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  oldAccountsFbController.deleteOldAccountFb
);

module.exports = router; 