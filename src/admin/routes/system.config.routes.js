/*
 * @Author: diaochan
 * @Date: 2025-03-20 15:56:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-20 16:50:43
 * @Description: 
 */
/**
 * 系统配置路由
 * 处理系统配置相关的路由
 */
const express = require('express');
const { body, param } = require('express-validator');
const systemConfigController = require('../controllers/system.config.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有系统配置路由都需要认证和管理员权限
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.hasPermission('system:config'));
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/support/system/configs
 * @desc 获取所有系统配置
 * @access Private (需要 system:config 权限)
 */
router.get(
  '/',
  systemConfigController.getAllConfigs
);

/**
 * @route GET /api/support/system/configs/:key
 * @desc 获取指定键的系统配置
 * @access Private (需要 system:config 权限)
 */
router.get(
  '/:key',
  [
    param('key')
      .notEmpty()
      .withMessage('配置键不能为空')
      .isString()
      .withMessage('配置键必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  systemConfigController.getConfigByKey
);

/**
 * @route PUT /api/support/system/configs/:key
 * @desc 更新指定键的系统配置
 * @access Private (需要 system:config 权限)
 */
router.put(
  '/:key',
  [
    param('key')
      .notEmpty()
      .withMessage('配置键不能为空')
      .isString()
      .withMessage('配置键必须是字符串'),
    body('value')
      .notEmpty()
      .withMessage('配置值不能为空'),
    body('description')
      .optional()
      .isString()
      .withMessage('配置描述必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  systemConfigController.updateConfig
);

/**
 * @route POST /api/support/system/configs
 * @desc 批量更新系统配置
 * @access Private (需要 system:config 权限)
 */
router.post(
  '/',
  [
    body('configs')
      .notEmpty()
      .withMessage('配置数据不能为空')
      .isObject()
      .withMessage('配置数据必须是对象格式')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  systemConfigController.updateConfigs
);

// 以下是特殊用途的便捷API，更像是RPC风格的API

/**
 * @route GET /api/support/system/configs/group/max-members
 * @desc 获取群组最大成员数
 * @access Private (需要 system:config 权限)
 */
router.get(
  '/group/max-members',
  systemConfigController.getMaxGroupMembers
);

/**
 * @route GET /api/support/system/configs/group/commission-rate
 * @desc 获取群主收益率
 * @access Private (需要 system:config 权限)
 */
router.get(
  '/group/commission-rate',
  systemConfigController.getGroupOwnerCommissionRate
);

/**
 * @route GET /api/support/system/configs/invite/reward-amount
 * @desc 获取邀请奖励金额
 * @access Private (需要 system:config 权限)
 */
router.get(
  '/invite/reward-amount',
  systemConfigController.getInviteRewardAmount
);

module.exports = router; 