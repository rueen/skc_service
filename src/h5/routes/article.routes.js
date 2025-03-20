/**
 * H5端文章路由
 * 处理文章相关的路由
 */
const express = require('express');
const { param, query } = require('express-validator');
const articleController = require('../controllers/article.controller');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/h5/articles/:id
 * @desc 获取文章详情
 * @access Public
 */
router.get(
  '/:id',
  rateLimiterMiddleware.apiLimiter,
  [
    param('id')
      .notEmpty()
      .withMessage('文章ID不能为空')
      .isInt()
      .withMessage('文章ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.getDetail
);

module.exports = router; 