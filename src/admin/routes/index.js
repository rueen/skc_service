/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-15 16:39:22
 * @Description: 
 */
/**
 * 路由索引文件
 * 集中管理所有API路由
 */
const express = require('express');
const authRoutes = require('./auth.routes');
const waiterRoutes = require('./waiter.routes');
const articleRoutes = require('./article.routes');
const channelRoutes = require('./channel.routes');
const uploadRoutes = require('./upload.routes');
const groupRoutes = require('./group.routes');
const memberRoutes = require('./member.routes');
const taskRoutes = require('./task.routes');

const router = express.Router();

// API前缀
const { API_PREFIX, PUBLIC_API_PREFIX } = require('../../shared/config/api.config');

// 用户认证路由
router.use(`${API_PREFIX}/users`, authRoutes);

// 小二管理路由
router.use(`${API_PREFIX}/waiters`, waiterRoutes);

// 文章管理路由
router.use(`${API_PREFIX}/articles`, articleRoutes);

// 渠道管理路由
router.use(`${API_PREFIX}/channels`, channelRoutes);

// 群组管理路由
router.use(`${API_PREFIX}/groups`, groupRoutes);

// 会员管理路由
router.use(`${API_PREFIX}/members`, memberRoutes);

// 任务管理路由
router.use(`${API_PREFIX}/tasks`, taskRoutes);

// 文件上传路由（公共接口）
router.use(`${PUBLIC_API_PREFIX}/upload`, uploadRoutes);

// 在这里添加其他路由
// router.use(`${API_PREFIX}/taskSubmitted`, taskSubmittedRoutes);
// router.use(`${API_PREFIX}/accounts`, accountRoutes);
// router.use(`${API_PREFIX}/settlement`, settlementRoutes);

module.exports = router; 