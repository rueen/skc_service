/**
 * 任务调度路由
 */
const express = require('express');
const router = express.Router();
const taskSchedulerController = require('../controllers/task-scheduler.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 手动触发任务状态更新 (需要管理员权限)
router.post('/trigger-update', authMiddleware.verifyToken, authMiddleware.isAdmin, taskSchedulerController.triggerTaskStatusUpdate);

// 重新配置任务调度 (需要管理员权限)
router.post('/reconfigure', authMiddleware.verifyToken, authMiddleware.isAdmin, taskSchedulerController.reconfigureScheduler);

// 获取当前调度配置 (需要管理员权限)
router.get('/config', authMiddleware.verifyToken, authMiddleware.isAdmin, taskSchedulerController.getSchedulerConfig);

// 设置任务调度服务配置 (需要管理员权限)
router.post('/set-service', authMiddleware.verifyToken, authMiddleware.isAdmin, taskSchedulerController.setSchedulerServiceConfig);

module.exports = router; 