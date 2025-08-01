/*
 * @Author: diaochan
 * @Date: 2025-03-25 15:54:14
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-21 11:53:32
 * @Description: 
 */
/**
 * H5端路由索引文件
 * 集中管理所有H5端API路由
 */
const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const taskRoutes = require('./task.routes');
const memberRoutes = require('./member.routes');
const channelRoutes = require('./channel.routes');
const articleRoutes = require('./article.routes');
const taskEnrollRoutes = require('./task-enroll.routes');
const inviteRoutes = require('./invite.routes');
const groupRoutes = require('./group.routes');
const withdrawalRoutes = require('./withdrawal.routes');
const taskSubmitRoutes = require('./task-submit.routes');
const taskGroupRoutes = require('./task-group.routes');
const notificationRoutes = require('./notification.routes');
const systemConfigRoutes = require('./system-config.routes');
const paymentChannelRoutes = require('./payment-channel.routes');
const adRoutes = require('./ad.routes');
const messageRoutes = require('./message.routes');
const apiSignMiddleware = require('../../shared/middlewares/api-sign.middleware');

const router = express.Router();

// 应用API签名验证 - 对所有路由生效
router.use(apiSignMiddleware({
  baseUrl: process.env.H5_BASE_URL
}));

// 用户认证路由
router.use('/auth', authRoutes);

// 用户信息路由
router.use('/user', userRoutes);

// 任务相关路由
router.use('/tasks', taskRoutes);

// 任务提交相关路由
router.use('/task-submit', taskSubmitRoutes);

// 任务组相关路由
router.use('/task-groups', taskGroupRoutes);

// 任务报名相关路由
router.use('/task-enroll', taskEnrollRoutes);

// 会员相关路由
router.use('/members', memberRoutes);

// 邀请相关路由
router.use('/members/invite', inviteRoutes);

// 群组相关路由
router.use('/members/groups', groupRoutes);

// 渠道相关路由
router.use('/channels', channelRoutes);

// 文章相关路由
router.use('/articles', articleRoutes);

// 提现账户和提现记录路由（共用一个路由文件）
router.use('/withdrawal', withdrawalRoutes);

// 通知相关路由
router.use('/notifications', notificationRoutes);

// 系统配置路由
router.use('/system-configs', systemConfigRoutes);

// 支付渠道路由
router.use('/payment-channels', paymentChannelRoutes);

// 广告路由
router.use('/ads', adRoutes);

// 站内信路由
router.use('/messages', messageRoutes);

module.exports = router; 