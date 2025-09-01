/**
 * H5端广告路由
 * 处理H5端广告相关的路由配置
 */
const express = require('express');
const { query } = require('express-validator');
const adController = require('../controllers/ad.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

// 与任务路由保持一致，需要登录认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/ads
 * @desc 获取H5端广告列表
 * @access Private
 */
router.get(
  '/',
  [
    query('location')
      .notEmpty()
      .withMessage('广告位置不能为空')
      .isString()
      .withMessage('广告位置必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  adController.getList
);

module.exports = router; 