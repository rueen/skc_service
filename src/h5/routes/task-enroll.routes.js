/*
 * @Author: diaochan
 * @Date: 2025-03-23 11:08:17
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:53:32
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
 * 报名任务
 * 
 * 请求方式: POST
 * 请求路径: /:taskId
 * 路径参数:
 *   - taskId: 任务ID
 * 
 * 成功响应:
 *   - code: 200
 *   - message: 报名成功
 *   - data: 报名记录详情
 * 
 * 错误响应:
 *   - code: 400，任务不存在/已结束/已报名等错误
 *   - code: 401，用户未登录
 *   - code: 500，服务器内部错误
 */
router.post('/:taskId', taskEnrollController.enrollTask);

/**
 * 获取已报名任务列表
 * 
 * 请求方式: GET
 * 请求路径: /record
 * 查询参数:
 *   - page: 页码，默认为1
 *   - pageSize: 每页条数，默认为10
 * 
 * 成功响应:
 *   - code: 200
 *   - data: {
 *       list: 任务列表,
 *       total: 总任务数,
 *       page: 当前页码,
 *       pageSize: 每页条数
 *     }
 * 
 * 错误响应:
 *   - code: 401，用户未登录
 *   - code: 500，服务器内部错误
 */
router.get('/record', taskEnrollController.getEnrolledTasks);

/**
 * 取消任务报名
 * 
 * 请求方式: DELETE
 * 请求路径: /:taskId
 * 路径参数:
 *   - taskId: 要取消报名的任务ID
 * 
 * 成功响应:
 *   - code: 200
 *   - message: 取消报名成功
 * 
 * 错误响应:
 *   - code: 400，未报名该任务/任务已开始等错误
 *   - code: 401，用户未登录
 *   - code: 404，任务不存在
 *   - code: 500，服务器内部错误
 */
router.delete('/:taskId', taskEnrollController.cancelEnrollment);

/**
 * 检查是否已报名任务
 * 
 * 请求方式: GET
 * 请求路径: /:taskId/check
 * 路径参数:
 *   - taskId: 要检查的任务ID
 * 
 * 成功响应:
 *   - code: 200
 *   - data: {
 *       isEnrolled: 是否已报名(布尔值),
 *       enrollmentId: 报名记录ID(如果已报名)
 *     }
 * 
 * 错误响应:
 *   - code: 401，用户未登录
 *   - code: 404，任务不存在
 *   - code: 500，服务器内部错误
 */
router.get('/:taskId/check', taskEnrollController.checkEnrollment);

module.exports = router; 