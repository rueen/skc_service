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
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('memberNickname')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('groupId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.list
);

/**
 * @route GET /api/admin/members/export
 * @desc 导出会员列表
 * @access Private (需要 member:list 权限)
 */
router.get(
  '/export',
  authMiddleware.hasPermission('member:list'),
  [
    query('memberNickname')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('groupId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.exportMembers
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ min: 4, max: 50 })
      .withMessage('common.validation.memberAccountLength'),
    body('password')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ min: 8, max: 20 })
      .withMessage('common.validation.memberPasswordLength')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('common.validation.memberPasswordFormat'),
    body('memberNickname')
      .optional()
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('groupIds.*')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('inviterId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('occupation')
      .optional()
      .isIn(Object.values(OccupationType))
      .withMessage('common.validation.invalid'),
    body('phone')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('common.validation.formatInvalid'),
    body('gender')
      .optional()
      .isIn([0, 1, 2])
      .withMessage('common.validation.invalid'),
    body('telegram')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('memberNickname')
      .optional()
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('memberAccount')
      .optional()
      .isLength({ min: 4, max: 50 })
      .withMessage('common.validation.memberAccountLength'),
    body('password')
      .optional()
      .isLength({ min: 8, max: 20 })
      .withMessage('common.validation.memberPasswordLength')
      .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,20}$/)
      .withMessage('common.validation.memberPasswordFormat'),
    body('groupIds')
      .optional()
      .isArray()
      .withMessage('common.validation.mustBeArray'),
    body('groupIds.*')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('inviterId')
      .optional()
      .custom((value) => {
        // 允许传入 null 或整数
        if (value === null) return true;
        return Number.isInteger(Number(value));
      })
      .withMessage('common.validation.inviterIdFormat'),
    body('isNew')
      .optional()
      .isIn([0, 1])
      .withMessage('common.validation.invalid')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getTaskStats
);

/**
 * @route GET /api/admin/members/:id/withdrawal-accounts
 * @desc 获取指定会员的提现账户列表
 * @access Private (需要 member:view 权限)
 */
router.get(
  '/:id/withdrawal-accounts',
  authMiddleware.hasPermission('member:view'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getWithdrawalAccounts
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('amount')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isFloat({ min: 0.01 })
      .withMessage('common.validation.amountFormat'),
    body('remark')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 255 })
      .withMessage('common.validation.maxLength{max:255}')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('amount')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isFloat({ min: 0.01 })
      .withMessage('common.validation.amountFormat'),
    body('remark')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 255 })
      .withMessage('common.validation.maxLength{max:255}')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.deductReward
);

// 获取会员账户余额
/**
 * @api {get} /api/admin/members/:id/balance 获取会员账户余额
 * @apiName GetMemberBalance
 * @apiGroup Member
 * @apiPermission member:view
 * 
 * @apiParam {Number} id 会员ID
 * 
 * @apiSuccess {Object} data 余额信息
 * @apiSuccess {Number} data.balance 账户余额
 * @apiSuccess {Number} data.withdrawalAmount 已提现金额
 * 
 * @apiError (404) NotFound 会员不存在
 * @apiError (500) ServerError 服务器错误
 */
router.get(
  '/:id/balance',
  authMiddleware.hasPermission('member:view'),
  [
    param('id')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  memberController.getMemberBalance
);

module.exports = router; 