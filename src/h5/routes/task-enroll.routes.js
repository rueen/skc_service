/*
 * @Author: diaochan
 * @Date: 2025-03-23 11:08:17
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-30 12:10:13
 * @Description: 
 */
/**
 * 任务报名路由
 * 处理H5端用户报名、查询报名状态等相关操作
 */
const express = require('express');
const router = express.Router();
const taskEnrollController = require('../controllers/task-enroll.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

// 需要先验证用户身份
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * @route POST /api/h5/task-enroll/:taskId
 * @desc 报名任务
 * @access Private
 */
router.post('/:taskId', taskEnrollController.enrollTask);

/**
 * @route GET /api/h5/task-enroll/record
 * @desc 获取已报名任务列表
 * @access Private
 */
router.get('/record', taskEnrollController.getEnrolledTasks);

/**
 * @route DELETE /api/h5/task-enroll/:taskId
 * @desc 取消任务报名
 * @access Private
 */
router.delete('/:taskId', taskEnrollController.cancelEnrollment);

/**
 * @route GET /api/h5/task-enroll/:taskId/check
 * @desc 检查是否已报名任务
 * @access Private
 */
router.get('/:taskId/check', taskEnrollController.checkEnrollment);

module.exports = router; 