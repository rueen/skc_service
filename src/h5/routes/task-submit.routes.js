/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:35:24
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

// 提交任务
router.post('/task-submit', authMiddleware.verifyToken, taskSubmitController.submitTask);

// 获取已提交任务详情
router.get('/submitted-tasks/:id', authMiddleware.verifyToken, taskSubmitController.getSubmittedTaskDetail);

// 检查任务提交状态
router.get('/task-submit/check/:taskId', authMiddleware.verifyToken, taskSubmitController.checkSubmission);

// 获取会员已提交任务列表
router.get('/submitted-tasks', authMiddleware.verifyToken, taskSubmitController.getMemberSubmittedTasks);

module.exports = router; 