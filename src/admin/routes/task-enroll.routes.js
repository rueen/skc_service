/*
 * @Author: diaochan
 * @Date: 2025-03-23 14:48:17
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-23 16:34:27
 * @Description: 
 */
/**
 * 管理后台任务报名路由
 */
const express = require('express');
const router = express.Router();
const taskEnrollController = require('../controllers/task-enroll.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// 需要先验证管理员身份
router.use(authMiddleware.verifyToken, authMiddleware.isAdmin);

// 获取任务报名列表
router.get('/enrolled-tasks', taskEnrollController.getEnrollmentList);

// 删除任务报名记录
router.delete('/task-enroll/:id', taskEnrollController.deleteEnrollment);

// 获取任务报名统计信息
router.get('/tasks/:taskId/enroll-stats', taskEnrollController.getEnrollmentStats);

module.exports = router; 