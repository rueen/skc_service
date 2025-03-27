/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:08:47
 * @Description: 
 */
/**
 * Admin端路由索引文件
 * 集中管理所有Admin端API路由
 */
const express = require('express');
const authRoutes = require('./auth.routes');
const memberRoutes = require('./member.routes');
const taskRoutes = require('./task.routes');
const channelRoutes = require('./channel.routes');
const systemConfigRoutes = require('./system.config.routes');
const waiterRoutes = require('./waiter.routes');
const accountRoutes = require('./account.routes');
const articleRoutes = require('./article.routes');
const groupRoutes = require('./group.routes');
const billRoutes = require('./bill.routes');
const withdrawalRoutes = require('./withdrawal.routes');
const submittedTaskRoutes = require('./submitted-task.routes');

const router = express.Router();

// API前缀
const { API_PREFIX } = require('../../shared/config/api.config');

// 用户认证路由
router.use(`${API_PREFIX}/auth`, authRoutes);

// 任务管理路由
router.use(`${API_PREFIX}/tasks`, taskRoutes);
// 已提交任务
router.use(`${API_PREFIX}/submitted-tasks`, submittedTaskRoutes);

// 账号管理路由
router.use(`${API_PREFIX}/accounts`, accountRoutes);

// 会员管理路由
router.use(`${API_PREFIX}/members`, memberRoutes);

// 渠道管理路由
router.use(`${API_PREFIX}/channels`, channelRoutes);

// 群组管理路由
router.use(`${API_PREFIX}/groups`, groupRoutes);

// 提现管理路由
router.use(`${API_PREFIX}/withdrawals`, withdrawalRoutes);

// 账单管理路由
router.use(`${API_PREFIX}/bills`, billRoutes);

// 小二管理路由
router.use(`${API_PREFIX}/waiters`, waiterRoutes);

// 文章管理路由
router.use(`${API_PREFIX}/articles`, articleRoutes);

// 系统配置路由
router.use(`${API_PREFIX}/system-configs`, systemConfigRoutes);

module.exports = router; 