/*
 * @Author: diaochan
 * @Date: 2025-03-20 15:56:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-02 10:21:34
 * @Description: 
 */
/**
 * 系统配置路由
 * 处理系统配置相关的路由
 */
const express = require('express');
const { body, param } = require('express-validator');
const systemConfigController = require('../controllers/system-config.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有系统配置路由都需要认证和管理员权限
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.hasPermission('system:config'));
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/admin/system-configs
 * @desc 获取所有系统配置
 * @access Private (需要 system:config 权限)
 */
router.get(
  '/',
  systemConfigController.getAllConfigs
);

/**
 * @route POST /api/admin/system-configs
 * @desc 批量更新系统配置
 * @access Private (需要 system:config 权限)
 */
router.post(
  '/',
  [
    body('configs')
      .notEmpty()
      .withMessage('配置数据不能为空')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  systemConfigController.updateConfigs
);

module.exports = router; 