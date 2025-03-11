/**
 * 路由索引文件
 * 集中管理所有API路由
 */
const express = require('express');
const authRoutes = require('./auth.routes');
const waiterRoutes = require('./waiter.routes');

const router = express.Router();

// API前缀
const API_PREFIX = '/api/support';

// 用户认证路由
router.use(`${API_PREFIX}/users`, authRoutes);

// 小二管理路由
router.use(`${API_PREFIX}/waiters`, waiterRoutes);

// 在这里添加其他路由
// router.use(`${API_PREFIX}/tasks`, taskRoutes);
// router.use(`${API_PREFIX}/taskSubmitted`, taskSubmittedRoutes);
// router.use(`${API_PREFIX}/accounts`, accountRoutes);
// router.use(`${API_PREFIX}/members`, memberRoutes);
// router.use(`${API_PREFIX}/channels`, channelRoutes);
// router.use(`${API_PREFIX}/group`, groupRoutes);
// router.use(`${API_PREFIX}/settlement`, settlementRoutes);
// router.use(`${API_PREFIX}/articles`, articleRoutes);

module.exports = router; 