/**
 * 渠道控制器
 * 处理渠道相关的请求
 */
const channelModel = require('../../shared/models/channel.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
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
    
    // 获取渠道
    const channel = await channelModel.getById(id);
    if (!channel) {
      return responseUtil.notFound(res, i18n.t('channel.admin.channelNotFound', req.lang));
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
    
    // 创建渠道
    const result = await channelModel.create({
      name,
      icon,
      customFields
    }, req.lang);
    
    return responseUtil.success(res, result);
  } catch (error) {
    if (error.message === i18n.t('channel.common.nameExists', req.lang)) {
      return responseUtil.badRequest(res, error.message);
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
      return responseUtil.badRequest(res, i18n.t('channel.admin.idNotEmpty', req.lang));
    }
    
    // 检查渠道是否存在
    const channel = await channelModel.getById(id);
    if (!channel) {
      return responseUtil.notFound(res, i18n.t('channel.admin.channelNotFound', req.lang));
    }
    
    // 更新渠道
    const success = await channelModel.update({
      id,
      name,
      icon,
      customFields
    }, req.lang);
    
    if (!success) {
      return responseUtil.serverError(res);
    }
    
    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === i18n.t('channel.common.nameExists', req.lang)) {
      return responseUtil.badRequest(res, error.message);
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
      return responseUtil.badRequest(res, i18n.t('channel.admin.idNotEmpty', req.lang));
    }
    
    // 删除渠道
    const success = await channelModel.remove(id, req.lang);
    
    if (!success) {
      return responseUtil.notFound(res, i18n.t('channel.admin.channelNotFound', req.lang));
    }
    
    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message.includes(i18n.t('channel.common.associatedAccounts', req.lang)) || 
        error.message.includes(i18n.t('channel.common.associatedTasks', req.lang))) {
      return responseUtil.badRequest(res, error.message);
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