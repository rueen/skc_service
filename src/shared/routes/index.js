/**
 * 共享路由索引
 * 集中导出所有共享路由
 */
const express = require('express');
const healthRoutes = require('./health.routes');
const { router: uploadRoutes, setAppType } = require('./upload.routes');
const enumRoutes = require('./enum.routes');
const taskSchedulerRoutes = require('./task-scheduler.routes');

const router = express.Router();

// 健康检查路由
router.use('/api/health', healthRoutes);

// 上传路由
router.use('/api/upload', uploadRoutes);

// 枚举常量路由
router.use('/api/enums', enumRoutes);

// 任务调度路由
router.use('/api/task-scheduler', taskSchedulerRoutes);

module.exports = {
  router,
  setAppType
}; 