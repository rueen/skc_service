/**
 * 渠道控制器
 * 处理渠道相关的请求
 */
const channelModel = require('../../shared/models/channel.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');

/**
 * 获取渠道列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function list(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, keyword } = req.query;
    
    // 获取渠道列表
    const result = await channelModel.getList(
      { keyword },
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取渠道列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取渠道列表失败');
  }
}

/**
 * 获取渠道详情
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function get(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '渠道ID不能为空');
    }
    
    // 获取渠道
    const channel = await channelModel.getById(id);
    if (!channel) {
      return responseUtil.notFound(res, '渠道不存在');
    }
    
    return responseUtil.success(res, channel);
  } catch (error) {
    logger.error(`获取渠道详情失败: ${error.message}`);
    return responseUtil.serverError(res, '获取渠道详情失败');
  }
}

/**
 * 创建渠道
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function add(req, res) {
  try {
    const { name, icon, customFields } = req.body;
    
    if (!name) {
      return responseUtil.badRequest(res, '渠道名称不能为空');
    }
    
    // 创建渠道
    const result = await channelModel.create({
      name,
      icon,
      customFields
    });
    
    return responseUtil.success(res, result, '创建渠道成功');
  } catch (error) {
    if (error.message === '渠道名称已存在') {
      return responseUtil.badRequest(res, error.message);
    }
    logger.error(`创建渠道失败: ${error.message}`);
    return responseUtil.serverError(res, '创建渠道失败');
  }
}

/**
 * 更新渠道
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function edit(req, res) {
  try {
    const { id } = req.params;
    const { name, icon, customFields } = req.body;
    
    if (!id) {
      return responseUtil.badRequest(res, '渠道ID不能为空');
    }
    
    // 检查渠道是否存在
    const channel = await channelModel.getById(id);
    if (!channel) {
      return responseUtil.notFound(res, '渠道不存在');
    }
    
    // 更新渠道
    const success = await channelModel.update({
      id,
      name,
      icon,
      customFields
    });
    
    if (!success) {
      return responseUtil.serverError(res, '更新渠道失败');
    }
    
    return responseUtil.success(res, null, '更新渠道成功');
  } catch (error) {
    if (error.message === '渠道名称已存在') {
      return responseUtil.badRequest(res, error.message);
    }
    logger.error(`更新渠道失败: ${error.message}`);
    return responseUtil.serverError(res, '更新渠道失败');
  }
}

/**
 * 删除渠道
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '渠道ID不能为空');
    }
    
    // 删除渠道
    const success = await channelModel.remove(id);
    
    if (!success) {
      return responseUtil.notFound(res, '渠道不存在');
    }
    
    return responseUtil.success(res, null, '删除渠道成功');
  } catch (error) {
    if (error.message.includes('存在关联')) {
      return responseUtil.badRequest(res, error.message);
    }
    logger.error(`删除渠道失败: ${error.message}`);
    return responseUtil.serverError(res, '删除渠道失败');
  }
}

module.exports = {
  list,
  get,
  add,
  edit,
  remove
}; 