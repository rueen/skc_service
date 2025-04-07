/**
 * FB老账号管理路由
 */
const express = require('express');
const router = express.Router();
const oldAccountsFbController = require('../controllers/old-accounts-fb.controller');
const { authenticateJwt } = require('../../shared/middlewares/jwt.middleware');
const { checkPermission } = require('../../shared/middlewares/permission.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route GET /api/admin/old-accounts-fb
 * @desc 获取FB老账号列表
 * @access Private - Account List
 */
router.get(
  '/',
  [
    authenticateJwt,
    checkPermission('account:list'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是大于0的整数'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页条数必须是1-100之间的整数'),
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
    authenticateJwt,
    checkPermission('account:list'),
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
    authenticateJwt,
    checkPermission('account:list'),
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
    authenticateJwt,
    checkPermission('account:list'),
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
    authenticateJwt,
    checkPermission('account:list'),
    param('id')
      .isInt()
      .withMessage('ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  oldAccountsFbController.deleteOldAccountFb
);

module.exports = router; 