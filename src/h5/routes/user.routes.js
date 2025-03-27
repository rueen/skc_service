/*
 * @Author: diaochan
 * @Date: 2025-03-15 22:03:25
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:35:36
 * @Description: 
 */
/**
 * H5端用户路由
 * 处理用户信息相关的路由
 */
const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @route GET /api/h5/user/info
 * @desc 获取用户信息
 * @access Private
 */
router.get(
  '/info',
  authMiddleware.verifyToken,
  authController.getUserInfo
);

module.exports = router; 