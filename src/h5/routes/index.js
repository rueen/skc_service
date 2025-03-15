/**
 * H5端路由索引文件
 * 集中管理所有H5端API路由
 */
const express = require('express');
const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');
const memberRoutes = require('./member.routes');
const channelRoutes = require('./channel.routes');
const articleRoutes = require('./article.routes');

const router = express.Router();

// 用户认证路由
router.use('/auth', authRoutes);

// 任务相关路由
router.use('/tasks', taskRoutes);

// 会员相关路由
router.use('/members', memberRoutes);

// 渠道相关路由
router.use('/channels', channelRoutes);

// 文章相关路由
router.use('/articles', articleRoutes);

module.exports = router; 