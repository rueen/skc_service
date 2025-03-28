/**
 * 小二控制器
 * 处理小二管理相关的请求
 */
const waiterModel = require('../../shared/models/waiter.model');
const authUtil = require('../../shared/utils/auth.util');
const validatorUtil = require('../../shared/utils/validator.util');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');

/**
 * 获取小二列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getList(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, keyword } = req.query;
    
    // 获取小二列表
    const result = await waiterModel.getList({ keyword }, page, pageSize);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取小二列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取小二列表失败');
  }
}

/**
 * 创建小二
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function create(req, res) {
  try {
    const { username, password, isAdmin, remarks, permissions } = req.body;
    
    // 检查用户名是否已存在
    const existingWaiter = await waiterModel.findByUsername(username);
    if (existingWaiter) {
      return responseUtil.badRequest(res, '用户名已存在');
    }
    
    // 哈希密码
    const hashedPassword = await authUtil.hashPassword(password);
    
    // 创建小二
    const result = await waiterModel.create({
      username,
      password: hashedPassword,
      isAdmin: !!isAdmin,
      remarks,
      permissions
    });
    
    return responseUtil.success(res, { id: result.id }, '创建小二成功');
  } catch (error) {
    logger.error(`创建小二失败: ${error.message}`);
    return responseUtil.serverError(res, '创建小二失败');
  }
}

/**
 * 更新小二信息
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function update(req, res) {
  try {
    const { id, username, password, isAdmin, remarks, permissions } = req.body;
    
    // 验证ID
    if (!validatorUtil.isValidId(id)) {
      return responseUtil.badRequest(res, '无效的小二ID');
    }
    
    // 检查小二是否存在
    const waiter = await waiterModel.findById(id);
    if (!waiter) {
      return responseUtil.notFound(res, '小二不存在');
    }

    // 如果要更新用户名，检查是否已存在
    if (username && username !== waiter.username) {
      const existingWaiter = await waiterModel.findByUsername(username);
      if (existingWaiter) {
        return responseUtil.badRequest(res, '用户名已存在');
      }
    }
    
    // 准备更新数据
    const updateData = {};
    
    // 如果提供了密码，则哈希密码
    if (password) {
      updateData.password = await authUtil.hashPassword(password);
    }
    
    // 更新其他字段
    if (username) updateData.username = username;
    if (isAdmin !== undefined) updateData.isAdmin = !!isAdmin;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (permissions !== undefined) updateData.permissions = permissions;
    
    // 更新小二信息
    const success = await waiterModel.update(id, updateData);
    
    if (!success) {
      return responseUtil.serverError(res, '更新小二信息失败');
    }
    
    return responseUtil.success(res, {}, '更新小二信息成功');
  } catch (error) {
    logger.error(`更新小二信息失败: ${error.message}`);
    return responseUtil.serverError(res, '更新小二信息失败');
  }
}

/**
 * 删除小二
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.body;
    
    // 验证ID
    if (!validatorUtil.isValidId(id)) {
      return responseUtil.badRequest(res, '无效的小二ID');
    }
    
    // 检查小二是否存在
    const waiter = await waiterModel.findById(id);
    if (!waiter) {
      return responseUtil.notFound(res, '小二不存在');
    }
    
    // 不允许删除管理员账号
    if (waiter.isAdmin) {
      return responseUtil.forbidden(res, '不允许删除管理员账号');
    }
    
    // 删除小二
    const success = await waiterModel.remove(id);
    
    if (!success) {
      return responseUtil.serverError(res, '删除小二失败');
    }
    
    return responseUtil.success(res, {}, '删除小二成功');
  } catch (error) {
    logger.error(`删除小二失败: ${error.message}`);
    return responseUtil.serverError(res, '删除小二失败');
  }
}

module.exports = {
  getList,
  create,
  update,
  remove
}; 