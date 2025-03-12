/**
 * 文章路由
 * 处理文章相关的路由
 */
const express = require('express');
const { body } = require('express-validator');
const articleController = require('../controllers/article.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../utils/validator.util');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// 所有文章路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/support/articles/get
 * @desc 获取文章
 * @access Private
 */
router.get('/get', articleController.get);

/**
 * @route PUT /api/support/articles/edit
 * @desc 更新文章
 * @access Private
 */
router.put(
  '/edit',
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
  (req, res, next) => {
    // 验证请求参数
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  articleController.edit
);

module.exports = router; 