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
const groupController = require('../controllers/group.controller');

const router = express.Router();

// 所有会员路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/members
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
 * @route GET /api/admin/members/:id
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
 * @route POST /api/admin/members
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
      .withMessage('密码长度必须在8-20位之间')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('密码必须包含字母和数字'),
    body('memberNickname')
      .optional()
      .isLength({ max: 50 })
      .withMessage('会员昵称长度不能超过50个字符'),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('群组ID必须是数组格式'),
    body('groupIds.*')
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
 * @route PUT /api/admin/members/:id
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
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('群组ID必须是数组格式'),
    body('groupIds.*')
      .optional()
      .isInt()
      .withMessage('群组ID数组中的值必须是整数'),
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
 * @route DELETE /api/admin/members/:id
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

/**
 * @route GET /api/admin/members/:memberId/groups/stats
 * @desc 获取指定会员作为群主的统计信息
 * @access Private (需要 member:view 权限)
 */
router.get(
  '/:memberId/groups/stats',
  authMiddleware.hasPermission('member:view'),
  [
    param('memberId')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  groupController.getOwnerGroupStats
);

/**
 * @route GET /api/admin/members/:memberId/invite/stats
 * @desc 获取指定会员的邀请数据统计信息
 * @access Private (需要 member:view 权限)
 */
router.get(
  '/:memberId/invite/stats',
  authMiddleware.hasPermission('member:view'),
  [
    param('memberId')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getInviteStats
);

/**
 * @route GET /api/admin/members/:memberId/task/stats
 * @desc 获取指定会员的任务数据统计信息
 * @access Private (需要 member:view 权限)
 */
router.get(
  '/:memberId/task/stats',
  authMiddleware.hasPermission('member:view'),
  [
    param('memberId')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getTaskStats
);

/**
 * @route POST /api/admin/members/grant-reward
 * @desc 发放奖励给会员
 * @access Private (需要 member:edit 权限)
 */
router.post(
  '/grant-reward',
  authMiddleware.hasPermission('member:edit'),
  [
    body('memberId')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数'),
    body('amount')
      .notEmpty()
      .withMessage('奖励金额不能为空')
      .isFloat({ min: 0.01 })
      .withMessage('奖励金额必须为大于0的数字'),
    body('remark')
      .notEmpty()
      .withMessage('备注说明不能为空')
      .isLength({ max: 255 })
      .withMessage('备注说明不能超过255个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.grantReward
);

/**
 * @route POST /api/admin/members/deduct-reward
 * @desc 从会员账户扣除奖励
 * @access Private (需要 member:edit 权限)
 */
router.post(
  '/deduct-reward',
  authMiddleware.hasPermission('member:edit'),
  [
    body('memberId')
      .notEmpty()
      .withMessage('会员ID不能为空')
      .isInt()
      .withMessage('会员ID必须是整数'),
    body('amount')
      .notEmpty()
      .withMessage('扣除金额不能为空')
      .isFloat({ min: 0.01 })
      .withMessage('扣除金额必须为大于0的数字'),
    body('remark')
      .notEmpty()
      .withMessage('备注说明不能为空')
      .isLength({ max: 255 })
      .withMessage('备注说明不能超过255个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.deductReward
);

module.exports = router; 