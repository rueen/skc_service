/**
 * H5端站内信路由
 * 处理H5端站内信相关的路由
 */
const express = require('express');
const { body } = require('express-validator');
const messageController = require('../controllers/message.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');

const router = express.Router();

// 所有站内信路由都需要认证
router.use(authMiddleware.verifyToken);

/**
 * @route GET /api/h5/messages
 * @desc 获取有效期内的站内信列表
 * @access Private (需要认证)
 */
router.get(
  '/',
  messageController.getList
);

/**
 * @route POST /api/h5/messages/read
 * @desc 标记站内信为已读
 * @access Private (需要认证)
 */
router.post(
  '/read',
  [
    body('messageId')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt({ min: 1 })
      .withMessage('common.validation.mustBePositiveInt')
  ],
  (req, res, next) => {
    if (!validatorUtil.validateRequest(req, res)) {
      return;
    }
    next();
  },
  messageController.markAsRead
);

module.exports = router; 