/**
 * H5端用户路由
 * 处理用户信息相关的路由
 */
const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

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