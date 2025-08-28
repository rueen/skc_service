/*
 * @Author: diaochan
 * @Date: 2025-04-19 20:29:36
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-24 13:13:36
 * @Description: 
 */
/**
 * 共享路由索引
 * 集中导出所有共享路由
 */
const express = require('express');
const healthRoutes = require('./health.routes');
const { router: uploadRoutes, setAppType } = require('./upload.routes');
const enumRoutes = require('./enum.routes');
const taskSchedulerRoutes = require('./task-scheduler.routes');
const timeRoutes = require('./time.routes');
const facebookScraperRoutes = require('./facebook-scraper.routes');
const locationRoutes = require('./location.routes');
const regionRoutes = require('./region.routes');

const router = express.Router();

// 健康检查路由
router.use('/api/health', healthRoutes);

// 上传路由
router.use('/api/upload', uploadRoutes);

// 枚举常量路由
router.use('/api/enums', enumRoutes);

// 任务调度路由
router.use('/api/task-scheduler', taskSchedulerRoutes);

// 时间接口路由
router.use('/api/time', timeRoutes);

// Facebook 数据抓取路由
router.use('/api/facebook', facebookScraperRoutes);

// 位置路由
router.use('/api/location', locationRoutes);

// 地区路由
router.use('/api', regionRoutes);

module.exports = {
  router,
  setAppType
}; 