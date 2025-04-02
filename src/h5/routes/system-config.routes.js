/*
 * @Author: diaochan
 * @Date: 2025-04-02 10:43:06
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-02 10:47:31
 * @Description: 
 */
/**
 * 系统配置路由
 * 处理H5端系统配置相关的路由
 */
const express = require('express');
const systemConfigController = require('../controllers/system-config.controller');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');

const router = express.Router();

/**
 * @route GET /api/h5/system-configs
 * @desc 获取所有系统配置
 * @access Public
 */
router.get(
  '/',
  rateLimiterMiddleware.apiLimiter,
  systemConfigController.getAllConfigs
);

module.exports = router; 