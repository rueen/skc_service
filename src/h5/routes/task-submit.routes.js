/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 22:10:48
 * @Description: 
 */
/**
 * 任务提交路由
 * 处理H5端任务提交相关路由配置
 */
const express = require('express');
const router = express.Router();
const taskSubmitController = require('../controllers/task-submit.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
// 需要先验证用户身份
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route GET /api/h5/task-submit
 * @desc 获取会员已提交任务列表
 * @access Private
 */
router.get(
  '/',
  taskSubmitController.getMemberSubmittedTasks
);

/**
 * @route GET /api/h5/task-submit/:id
 * @desc 获取已提交任务详情
 * @access Private
 */
router.get(
  '/:id',
  taskSubmitController.getSubmittedTaskDetail
);

/**
 * @route POST /api/h5/task-submit
 * @desc 提交任务
 * @access Private
 */
router.post(
  '/',
  taskSubmitController.submitTask
);

module.exports = router; 