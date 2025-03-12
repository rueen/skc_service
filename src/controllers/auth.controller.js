/**
 * 认证控制器
 * 处理用户登录和认证相关的请求
 */
const waiterModel = require('../models/waiter.model');
const authUtil = require('../utils/auth.util');
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

/**
 * 用户登录
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    // 查找用户
    const waiter = await waiterModel.findByUsername(username);
    if (!waiter) {
      return responseUtil.unauthorized(res, '用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await authUtil.comparePassword(password, waiter.password);
    if (!isPasswordValid) {
      return responseUtil.unauthorized(res, '用户名或密码错误');
    }

    // 更新最后登录时间
    await waiterModel.updateLastLoginTime(waiter.id);

    // 生成令牌
    const token = authUtil.generateToken({
      id: waiter.id,
      username: waiter.username,
      isAdmin: waiter.is_admin === 1,
      permissions: waiter.permissions
    });

    // 返回用户信息和令牌
    return responseUtil.success(res, {
      token,
      user: {
        id: waiter.id,
        username: waiter.username,
        isAdmin: waiter.is_admin === 1,
        permissions: waiter.permissions
      }
    }, '登录成功');
  } catch (error) {
    logger.error(`登录失败: ${error.message}`);
    return responseUtil.serverError(res, '登录过程中发生错误');
  }
}

/**
 * 获取当前用户信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getCurrentUser(req, res) {
  try {
    const userId = req.user.id;

    // 查找用户
    const waiter = await waiterModel.findById(userId);
    if (!waiter) {
      return responseUtil.notFound(res, '用户不存在');
    }

    // 返回用户信息
    return responseUtil.success(res, {
      id: waiter.id,
      username: waiter.username,
      isAdmin: waiter.is_admin === 1,
      permissions: waiter.permissions,
      lastLoginTime: waiter.last_login_time
    });
  } catch (error) {
    logger.error(`获取当前用户信息失败: ${error.message}`);
    return responseUtil.serverError(res, '获取用户信息过程中发生错误');
  }
}

module.exports = {
  login,
  getCurrentUser
}; 