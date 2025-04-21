/*
 * @Author: diaochan
 * @Date: 2025-03-12 14:28:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 17:09:10
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
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('keyword')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('content')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty'),
    body('location')
      .optional()
      .isLength({ max: 20 })
      .withMessage('common.validation.maxLength{max:20}')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('title')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 50 })
      .withMessage('common.validation.maxLength{max:50}'),
    body('content')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty'),
    body('location')
      .optional()
      .isLength({ max: 20 })
      .withMessage('common.validation.maxLength{max:20}')
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.remove
);

module.exports = router; 