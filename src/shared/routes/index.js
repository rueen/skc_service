/**
 * 共享路由索引
 * 集中导出所有共享路由
 */
const express = require('express');
const healthRoutes = require('./health.routes');

const router = express.Router();

// 健康检查路由
router.use('/api/health', healthRoutes);

module.exports = router; 