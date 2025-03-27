/*
 * @Author: diaochan
 * @Date: 2025-03-25 15:54:14
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:50:34
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

const router = express.Router();

// 用户认证路由
router.use('/auth', authRoutes);

// 用户信息路由
router.use('/user', userRoutes);

// 任务相关路由
router.use('/tasks', taskRoutes);

// 任务提交相关路由
router.use('/task-submit', taskSubmitRoutes);

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

module.exports = router; 