/**
 * 渠道控制器
 * 处理渠道相关的请求
 */
const channelModel = require('../../shared/models/channel.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

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
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('admin.channel.notFound', req.lang));
    }
    
    return responseUtil.success(res, channel);
  } catch (error) {
    logger.error(`获取渠道详情失败: ${error.message}`);
    return responseUtil.serverError(res);
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
    
    return responseUtil.success(res, result);
  } catch (error) {
    if (error.message === '渠道名称已存在') {
      return responseUtil.badRequest(res, i18n.t('admin.channel.nameExists', req.lang));
    }
    logger.error(`创建渠道失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('admin.channel.notFound', req.lang));
    }
    
    // 更新渠道
    const success = await channelModel.update({
      id,
      name,
      icon,
      customFields
    });
    
    if (!success) {
      return responseUtil.serverError(res);
    }
    
    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === '渠道名称已存在') {
      return responseUtil.badRequest(res, i18n.t('admin.channel.nameExists', req.lang));
    }
    logger.error(`更新渠道失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('admin.channel.notFound', req.lang));
    }
    
    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === '该渠道下存在关联账号，无法删除') {
      return responseUtil.badRequest(res, i18n.t('admin.channel.associatedAccount', req.lang));
    }
    if (error.message === '该渠道下存在关联任务，无法删除') {
      return responseUtil.badRequest(res, i18n.t('admin.channel.associatedTask', req.lang));
    }
    logger.error(`删除渠道失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  list,
  get,
  add,
  edit,
  remove
}; 