/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:57:53
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

// 获取会员已提交任务列表
router.get(
  '/',
  taskSubmitController.getMemberSubmittedTasks
);

// 获取已提交任务详情
router.get(
  '/:id',
  taskSubmitController.getSubmittedTaskDetail
);

// 提交任务
router.post(
  '/',
  taskSubmitController.submitTask
);

// 检查任务提交状态
router.get(
  '/check/:taskId',
  taskSubmitController.checkSubmission
);

module.exports = router; 