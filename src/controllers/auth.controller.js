/**
 * 认证控制器
 * 处理用户登录和认证相关的请求
 */
const waiterModel = require('../models/waiter.model');
const authUtil = require('../utils/auth.util');
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

// 所有可用的权限列表
const ALL_PERMISSIONS = [
  'task:list',
  'task:create',
  'task:edit',
  'task:audit',
  'task:auditDetail',
  'account:list',
  'member:list',
  'member:create',
  'member:edit',
  'member:view',
  'channel:list',
  'group:list',
  'waiter:list',
  'settlement:withdrawal',
  'settlement:otherBills',
  'article:list'
].join(',');

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

    // 如果是管理员，赋予所有权限
    const permissions = waiter.is_admin === 1 ? ALL_PERMISSIONS : waiter.permissions;

    // 生成令牌
    const token = authUtil.generateToken({
      id: waiter.id,
      username: waiter.username,
      isAdmin: waiter.is_admin === 1,
      permissions
    });

    // 返回用户信息和令牌
    return responseUtil.success(res, {
      token,
      user: {
        id: waiter.id,
        username: waiter.username,
        isAdmin: waiter.is_admin === 1,
        permissions
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

    // 如果是管理员，返回所有权限
    const permissions = waiter.is_admin === 1 ? ALL_PERMISSIONS : waiter.permissions;

    // 返回用户信息
    return responseUtil.success(res, {
      id: waiter.id,
      username: waiter.username,
      isAdmin: waiter.is_admin === 1,
      permissions,
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