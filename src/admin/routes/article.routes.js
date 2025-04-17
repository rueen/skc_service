/*
 * @Author: diaochan
 * @Date: 2025-03-12 14:28:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 17:31:15
 * @Description: 
 */
/**
 * 文章路由
 * 处理文章相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const articleController = require('../controllers/article.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);
router.use(authMiddleware.hasPermission('article:list'));

/**
 * @route GET /api/admin/articles
 * @desc 获取文章列表
 * @access Private
 */
router.get(
  '/',
  [
    query('keyword').optional().isString().withMessage('article.validation.keywordString')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.list
);

/**
 * @route POST /api/admin/articles
 * @desc 添加文章
 * @access Private
 */
router.post(
  '/',
  [
    body('title')
      .notEmpty()
      .withMessage('article.validation.titleNotEmpty')
      .isLength({ max: 100 })
      .withMessage('article.validation.titleLength'),
    body('content')
      .notEmpty()
      .withMessage('article.validation.contentNotEmpty'),
    body('location')
      .optional()
      .isLength({ max: 50 })
      .withMessage('article.validation.locationLength')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.add
);

/**
 * @route PUT /api/admin/articles/:id
 * @desc 更新文章
 * @access Private
 */
router.put(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('article.validation.idNotEmpty')
      .isInt()
      .withMessage('article.validation.idInt'),
    body('title')
      .notEmpty()
      .withMessage('article.validation.titleNotEmpty')
      .isLength({ max: 100 })
      .withMessage('article.validation.titleLength'),
    body('content')
      .notEmpty()
      .withMessage('article.validation.contentNotEmpty'),
    body('location')
      .optional()
      .isLength({ max: 50 })
      .withMessage('article.validation.locationLength')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.edit
);

/**
 * @route DELETE /api/admin/articles/:id
 * @desc 删除文章
 * @access Private
 */
router.delete(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('article.validation.idNotEmpty')
      .isInt()
      .withMessage('article.validation.idInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.remove
);

module.exports = router; 