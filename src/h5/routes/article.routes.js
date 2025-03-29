/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-29 18:36:26
 * @Description: 
 */
/**
 * H5端文章路由
 * 处理文章相关的路由
 */
const express = require('express');
const { param } = require('express-validator');
const articleController = require('../controllers/article.controller');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/h5/articles/location/:location
 * @desc 通过位置标识获取文章详情
 * @access Public
 */
router.get(
  '/location/:location',
  rateLimiterMiddleware.apiLimiter,
  [
    param('location')
      .notEmpty()
      .withMessage('位置标识不能为空')
      .isString()
      .withMessage('位置标识必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.getDetailByLocation
);

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
  articleController.getDetailById
);

module.exports = router; 