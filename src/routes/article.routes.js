/*
 * @Author: diaochan
 * @Date: 2025-03-12 14:28:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-12 15:42:41
 * @Description: 
 */
/**
 * 文章路由
 * 处理文章相关的路由
 */
const express = require('express');
const { body, query } = require('express-validator');
const articleController = require('../controllers/article.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../utils/validator.util');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/support/articles/get
 * @desc 获取文章
 * @access Public
 */
router.get('/get', articleController.get);

/**
 * @route GET /api/support/articles/list
 * @desc 获取文章列表
 * @access Private
 */
router.get(
  '/list',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize').optional().isInt({ min: 1 }).withMessage('每页条数必须是大于0的整数'),
    query('keyword').optional().isString().withMessage('关键字必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.list
);

/**
 * @route POST /api/support/articles/add
 * @desc 添加文章
 * @access Private
 */
router.post(
  '/add',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('title')
      .notEmpty()
      .withMessage('标题不能为空')
      .isLength({ max: 100 })
      .withMessage('标题长度不能超过100个字符'),
    body('content')
      .notEmpty()
      .withMessage('内容不能为空'),
    body('location')
      .notEmpty()
      .withMessage('位置标识不能为空')
      .isLength({ max: 50 })
      .withMessage('位置标识长度不能超过50个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.add
);

/**
 * @route PUT /api/support/articles/edit
 * @desc 更新文章
 * @access Private
 */
router.put(
  '/edit',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('title')
      .notEmpty()
      .withMessage('标题不能为空')
      .isLength({ max: 100 })
      .withMessage('标题长度不能超过100个字符'),
    body('content')
      .notEmpty()
      .withMessage('内容不能为空'),
    body('id').optional().isInt().withMessage('文章ID必须是整数'),
    body('location').optional()
      .isLength({ max: 50 })
      .withMessage('位置标识长度不能超过50个字符'),
    body('newLocation').optional()
      .isLength({ max: 50 })
      .withMessage('新位置标识长度不能超过50个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.edit
);

/**
 * @route DELETE /api/support/articles/delete
 * @desc 删除文章
 * @access Private
 */
router.delete(
  '/delete',
  authMiddleware.verifyToken,
  rateLimiterMiddleware.apiLimiter,
  [
    body('id').optional().isInt().withMessage('文章ID必须是整数'),
    body('location').optional()
      .isLength({ max: 50 })
      .withMessage('位置标识长度不能超过50个字符')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  articleController.remove
);

module.exports = router; 