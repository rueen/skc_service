/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-24 20:55:08
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
const groupRoutes = require('./group.routes');
const memberRoutes = require('./member.routes');
const taskRoutes = require('./task.routes');
const accountRoutes = require('./account.routes');
const systemConfigRoutes = require('./system.config.routes');
const taskEnrollRoutes = require('./task-enroll.routes');
const billRoutes = require('./bill.routes');

const router = express.Router();

// API前缀
const { API_PREFIX, PUBLIC_API_PREFIX } = require('../../shared/config/api.config');

// 用户认证路由
router.use(`${API_PREFIX}/auth`, authRoutes);

// 用户信息路由
router.use(`${API_PREFIX}/user`, authRoutes);

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

// 账号管理路由
router.use(`${API_PREFIX}/accounts`, accountRoutes);

// 系统配置路由
router.use('/api/support/system/configs', systemConfigRoutes);

// 任务报名管理路由
router.use(`${API_PREFIX}`, taskEnrollRoutes);

// 账单管理路由
router.use(`${API_PREFIX}/bills`, billRoutes);

module.exports = router; 