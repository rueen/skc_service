/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 16:04:51
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
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('channelId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('category')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.optionalVerifyToken,
  taskController.getList
);

/**
 * @route GET /api/h5/tasks/all
 * @desc 获取所有任务列表（不筛选状态）
 * @param {number[]} taskIds - 任务ID数组，格式：taskIds[]=1&taskIds[]=2&taskIds[]=3
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {number} channelId - 频道ID筛选
 * @param {string} category - 分类筛选
 * @access Private
 */
router.get(
  '/all',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.page'),
    query('pageSize')
      .optional()
      .isInt({ min: 1 })
      .withMessage('common.validation.pageSize'),
    query('channelId')
      .optional()
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    query('category')
      .optional()
      .isString()
      .withMessage('common.validation.mustBeString'),
    query('taskIds')
      .optional()
      .custom((value) => {
        if (!value) return true;
        
        // 仅支持数组格式：taskIds[]=1&taskIds[]=2&taskIds[]=3
        if (!Array.isArray(value)) {
          throw new Error('taskIds must be an array');
        }
        
        // 验证数组中的每个元素都是正整数
        if (value.length > 0) {
          const isValid = value.every(id => {
            const num = parseInt(id, 10);
            return Number.isInteger(num) && num > 0;
          });
          
          if (!isValid) {
            throw new Error('taskIds must contain only positive integers');
          }
        }
        
        return true;
      })
      .withMessage('common.validation.taskIds')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.optionalVerifyToken,
  taskController.getAllList
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
      .withMessage('common.validation.mustNotBeEmpty')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  authMiddleware.optionalVerifyToken,
  taskController.getDetail
);

module.exports = router; 