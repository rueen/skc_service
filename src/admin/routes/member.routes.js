/**
 * 会员路由
 * 处理会员相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const memberController = require('../controllers/member.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const { OccupationType } = require('../../shared/config/enums');

const router = express.Router();

// 所有会员路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/support/members
 * @desc 获取会员列表
 * @access Private (需要 member:list 权限)
 */
router.get(
  '/',
  authMiddleware.hasPermission('member:list'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('memberNickname').optional().isString().withMessage('会员昵称必须是字符串'),
    query('groupId').optional().isInt().withMessage('群组ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.list
);

/**
 * @route GET /api/support/members/:id
 * @desc 获取会员详情
 * @access Private (需要 member:view 权限)
 */
router.get(
  '/:id',
  authMiddleware.hasPermission('member:view'),
  [
    param('id')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getDetail
);

/**
 * @route POST /api/support/members
 * @desc 创建会员
 * @access Private (需要 member:create 权限)
 */
router.post(
  '/',
  authMiddleware.hasPermission('member:create'),
  [
    body('memberAccount')
      .notEmpty()
      .withMessage('会员账号不能为空')
      .isLength({ min: 4, max: 50 })
      .withMessage('会员账号长度必须在4-50个字符之间'),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空')
      .isLength({ min: 8, max: 20 })
      .withMessage('密码长度必须在8-20个字符之间')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('密码必须包含字母和数字'),
    body('memberNickname')
      .optional()
      .isLength({ max: 50 })
      .withMessage('会员昵称长度不能超过50个字符'),
    body('groupId')
      .optional()
      .isInt()
      .withMessage('群组ID必须是整数'),
    body('inviterId')
      .optional()
      .isInt()
      .withMessage('邀请人ID必须是整数'),
    body('occupation')
      .optional()
      .isIn(Object.values(OccupationType))
      .withMessage('无效的职业类型'),
    body('phone')
      .optional()
      .isString()
      .withMessage('手机号必须是字符串'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('邮箱格式不正确'),
    body('gender')
      .optional()
      .isIn([0, 1, 2])
      .withMessage('性别值无效，应为 0(男)、1(女) 或 2(保密)'),
    body('telegram')
      .optional()
      .isString()
      .withMessage('Telegram账号必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.create
);

/**
 * @route PUT /api/support/members/:id
 * @desc 更新会员
 * @access Private (需要 member:edit 权限)
 */
router.put(
  '/:id',
  authMiddleware.hasPermission('member:edit'),
  [
    param('id')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数'),
    body('memberNickname')
      .optional()
      .isLength({ max: 50 })
      .withMessage('会员昵称长度不能超过50个字符'),
    body('memberAccount')
      .optional()
      .isLength({ max: 50 })
      .withMessage('会员账号长度不能超过50个字符'),
    body('password')
      .optional()
      .isLength({ min: 8, max: 20 })
      .withMessage('密码长度必须在8-20个字符之间')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('密码必须包含字母和数字'),
    body('groupId')
      .optional()
      .custom((value) => {
        // 允许传入 null 或整数
        if (value === null) return true;
        return Number.isInteger(Number(value));
      })
      .withMessage('群组ID必须是整数或null'),
    body('inviterId')
      .optional()
      .custom((value) => {
        // 允许传入 null 或整数
        if (value === null) return true;
        return Number.isInteger(Number(value));
      })
      .withMessage('邀请人ID必须是整数或null'),
    body('occupation')
      .optional()
      .isIn(Object.values(OccupationType))
      .withMessage('无效的职业类型')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.update
);

/**
 * @route DELETE /api/support/members/:id
 * @desc 删除会员
 * @access Private (需要 member:edit 权限)
 */
router.delete(
  '/:id',
  authMiddleware.hasPermission('member:edit'),
  [
    param('id')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.remove
);

module.exports = router; 