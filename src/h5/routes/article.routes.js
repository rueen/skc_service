/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 17:32:11
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
      .withMessage('article.validation.locationNotEmpty')
      .isString()
      .withMessage('article.validation.locationString')
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
      .withMessage('article.validation.idNotEmpty')
      .isInt()
      .withMessage('article.validation.idInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.getDetailById
);

module.exports = router; 