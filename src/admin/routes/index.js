/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:10:12
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-21 11:53:27
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
const taskGroupRoutes = require('./task-group.routes');
const channelRoutes = require('./channel.routes');
const systemConfigRoutes = require('./system-config.routes');
const waiterRoutes = require('./waiter.routes');
const accountRoutes = require('./account.routes');
const articleRoutes = require('./article.routes');
const groupRoutes = require('./group.routes');
const billRoutes = require('./bill.routes');
const withdrawalRoutes = require('./withdrawal.routes');
const submittedTaskRoutes = require('./submitted-task.routes');
const oldAccountsFbRoutes = require('./old-accounts-fb.routes');
const paymentChannelRoutes = require('./payment-channel.routes');
const adRoutes = require('./ad.routes');
const messageRoutes = require('./message.routes');
const apiSignMiddleware = require('../../shared/middlewares/api-sign.middleware');

const router = express.Router();

// 应用API签名验证 - 对所有路由生效
router.use(apiSignMiddleware({
  baseUrl: process.env.ADMIN_BASE_URL
}));

// 用户认证路由
router.use(`/auth`, authRoutes);

// 任务管理路由
router.use(`/tasks`, taskRoutes);
// 任务组管理路由
router.use(`/task-groups`, taskGroupRoutes);
// 已提交任务
router.use(`/submitted-tasks`, submittedTaskRoutes);

// 账号管理路由
router.use(`/accounts`, accountRoutes);

// 会员管理路由
router.use(`/members`, memberRoutes);

// 渠道管理路由
router.use(`/channels`, channelRoutes);

// 群组管理路由
router.use(`/groups`, groupRoutes);

// 提现管理路由
router.use(`/withdrawals`, withdrawalRoutes);

// 账单管理路由
router.use(`/bills`, billRoutes);

// 小二管理路由
router.use(`/waiters`, waiterRoutes);

// 文章管理路由
router.use(`/articles`, articleRoutes);

// 系统配置路由
router.use(`/system-configs`, systemConfigRoutes);

// 老账号管理路由
router.use(`/old-accounts-fb`, oldAccountsFbRoutes);

// 支付渠道管理路由
router.use(`/payment-channels`, paymentChannelRoutes);

// 广告管理路由
router.use(`/ads`, adRoutes);

// 站内信管理路由
router.use(`/messages`, messageRoutes);

module.exports = router; 