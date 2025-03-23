/*
 * @Author: diaochan
 * @Date: 2025-03-23 15:39:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-23 16:34:12
 * @Description: 
 */
/**
 * 已提交任务路由 - 管理后台
 * 处理Support端任务审核相关路由配置
 */
const express = require('express');
const router = express.Router();
const submittedTaskController = require('../controllers/submitted-task.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 获取已提交任务列表
router.get('/submitted-tasks', [
  authMiddleware.verifyToken, 
  authMiddleware.checkPermission('task:submitted')
], submittedTaskController.getSubmittedTasks);

// 获取已提交任务详情
router.get('/submitted-tasks/:id', [
  authMiddleware.verifyToken, 
  authMiddleware.checkPermission('task:submittedDetail')
], submittedTaskController.getSubmittedTaskDetail);

// 批量审核通过
router.post('/submitted-tasks/batch-approve', [
  authMiddleware.verifyToken, 
  authMiddleware.checkPermission('task:submitted')
], submittedTaskController.batchApproveSubmissions);

// 批量拒绝
router.post('/submitted-tasks/batch-reject', [
  authMiddleware.verifyToken, 
  authMiddleware.checkPermission('task:submitted')
], submittedTaskController.batchRejectSubmissions);

module.exports = router; 