/*
 * @Author: diaochan
 * @Date: 2025-03-20 10:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 10:26:10
 * @Description: 
 */
/**
 * 账号管理路由
 * 处理管理端账号相关的路由
 */
const express = require('express');
const { body, query } = require('express-validator');
const accountController = require('../controllers/account.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const { createValidatorMessages } = require('../../shared/i18n');

const router = express.Router();

// 应用中间件
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);
router.use(authMiddleware.hasPermission('account:list'));

// 提取请求中的语言参数
router.use((req, res, next) => {
  req.lang = validatorUtil.getLangFromRequest(req);
  next();
});

/**
 * @route GET /api/admin/accounts
 * @desc 获取账号列表
 * @access Private - Admin
 */
router.get(
  '/',
  (req, res, next) => {
    // 根据请求中的语言参数获取验证消息
    const lang = req.lang;
    
    // 应用验证规则
    const validations = [
      query('keyword')
        .optional()
        .isString()
        .withMessage(() => createValidatorMessages('account')(lang).keyword),
      query('account')
        .optional()
        .isString()
        .withMessage(() => createValidatorMessages('account')(lang).account),
      query('channelId')
        .optional()
        .isInt()
        .withMessage(() => createValidatorMessages('account')(lang).channelId),
      query('accountAuditStatus')
        .optional()
        .isIn(['pending', 'approved', 'rejected'])
        .withMessage(() => createValidatorMessages('account')(lang).accountAuditStatus),
      query('groupId')
        .optional()
        .isInt()
        .withMessage(() => createValidatorMessages('account')(lang).groupId),
      query('memberId')
        .optional()
        .isInt()
        .withMessage(() => createValidatorMessages('account')(lang).memberId)
    ];
    
    // 执行验证
    Promise.all(validations.map(validation => validation.run(req)))
      .then(() => {
        if (validatorUtil.validateRequest(req, res)) {
          next();
        }
      })
      .catch(err => {
        next(err);
      });
  },
  accountController.getAccounts
);

/**
 * @route POST /api/admin/accounts/batch-approve
 * @desc 批量审核通过账号
 * @access Private - Admin
 */
router.post(
  '/batch-approve',
  (req, res, next) => {
    const lang = req.lang;
    
    const validations = [
      body('ids')
        .isArray()
        .withMessage(() => createValidatorMessages('account')(lang).ids)
        .notEmpty()
        .withMessage(() => createValidatorMessages('account')(lang).ids)
    ];
    
    Promise.all(validations.map(validation => validation.run(req)))
      .then(() => {
        if (validatorUtil.validateRequest(req, res)) {
          next();
        }
      })
      .catch(err => {
        next(err);
      });
  },
  accountController.batchResolve
);

/**
 * @route POST /api/admin/accounts/batch-reject
 * @desc 批量审核拒绝账号
 * @access Private - Admin
 */
router.post(
  '/batch-reject',
  (req, res, next) => {
    const lang = req.lang;
    
    const validations = [
      body('ids')
        .isArray()
        .withMessage(() => createValidatorMessages('account')(lang).ids)
        .notEmpty()
        .withMessage(() => createValidatorMessages('account')(lang).ids),
      body('rejectReason')
        .optional()
        .isString()
        .withMessage(() => createValidatorMessages('account')(lang).rejectReason)
    ];
    
    Promise.all(validations.map(validation => validation.run(req)))
      .then(() => {
        if (validatorUtil.validateRequest(req, res)) {
          next();
        }
      })
      .catch(err => {
        next(err);
      });
  },
  accountController.batchReject
);

/**
 * @route PUT /api/admin/accounts/:id
 * @desc 编辑会员社交媒体账号信息
 * @access Private - 仅需account:list权限
 */
router.put(
  '/:id',
  (req, res, next) => {
    const lang = req.lang;
    
    const validations = [
      body('homeUrl')
        .optional()
        .isURL()
        .withMessage(() => createValidatorMessages('account')(lang).homeUrl),
      body('uid')
        .optional()
        .isString()
        .withMessage(() => createValidatorMessages('account')(lang).uid),
      body('account')
        .optional()
        .isString()
        .withMessage(() => createValidatorMessages('account')(lang).account),
      body('fansCount')
        .optional()
        .isInt({ min: 0 })
        .withMessage(() => createValidatorMessages('account')(lang).fansCount),
      body('friendsCount')
        .optional()
        .isInt({ min: 0 })
        .withMessage(() => createValidatorMessages('account')(lang).friendsCount),
      body('postsCount')
        .optional()
        .isInt({ min: 0 })
        .withMessage(() => createValidatorMessages('account')(lang).postsCount)
    ];
    
    Promise.all(validations.map(validation => validation.run(req)))
      .then(() => {
        if (validatorUtil.validateRequest(req, res)) {
          next();
        }
      })
      .catch(err => {
        next(err);
      });
  },
  accountController.editAccount
);

/**
 * @route GET /api/admin/accounts/:id
 * @desc 获取账号详情
 * @access Private - Admin
 */
router.get('/:id', authMiddleware.verifyToken, accountController.getAccountDetail);

/**
 * @route DELETE /api/admin/accounts/:id
 * @desc 删除账号
 * @access Private - Admin
 */
router.delete('/:id', authMiddleware.verifyToken, accountController.deleteAccount);

module.exports = router; 