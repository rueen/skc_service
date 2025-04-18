/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 09:24:08
 * @Description: 
 */
/**
 * H5端任务路由
 * 处理任务相关的路由
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validatorUtil = require('../../shared/utils/validator.util');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/tasks
 * @desc 获取任务列表
 * @access Private
 */
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是大于0的整数'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('每页条数必须是大于0的整数'),
    query('channelId')
      .optional()
      .isInt()
      .withMessage('渠道ID必须是整数'),
    query('category')
      .optional()
      .isString()
      .withMessage('任务类别必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.optionalVerifyToken,
  taskController.getList
);

/**
 * @route GET /api/h5/tasks/:id
 * @desc 获取任务详情
 * @access Private
 */
router.get(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('任务ID不能为空')
      .isInt()
      .withMessage('任务ID必须是整数')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.optionalVerifyToken,
  taskController.getDetail
);

module.exports = router; 