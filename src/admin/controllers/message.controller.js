/**
 * 管理端站内信控制器
 * 处理站内信管理相关的请求
 */
const messageModel = require('../../shared/models/message.model');
const responseUtil = require('../../shared/utils/response.util');
const validatorUtil = require('../../shared/utils/validator.util');
const { logger } = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取站内信列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getList(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      title, 
      status,
      sortField,
      sortOrder
    } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (title) filters.title = title;
    if (status) filters.status = status;
    
    // 构建排序选项
    const sortOptions = {};
    if (sortField && sortOrder) {
      sortOptions.field = sortField;
      sortOptions.order = sortOrder;
    }
    
    // 获取站内信列表
    const result = await messageModel.getList(filters, page, pageSize, sortOptions);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取站内信列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取站内信详情
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    
    // 验证ID
    if (!validatorUtil.isValidId(id)) {
      return responseUtil.badRequest(res, '无效的站内信ID');
    }
    
    // 获取站内信详情
    const message = await messageModel.getById(parseInt(id, 10));
    
    if (!message) {
      return responseUtil.notFound(res, '站内信不存在');
    }
    
    return responseUtil.success(res, message);
  } catch (error) {
    logger.error(`获取站内信详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 创建站内信
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function create(req, res) {
  try {
    const { title, content, startTime, endTime } = req.body;
    
    // 验证时间逻辑
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
      return responseUtil.badRequest(res, '开始时间必须早于结束时间');
    }
    
    // 创建站内信
    const result = await messageModel.create({
      title,
      content,
      startTime,
      endTime
    });
    
    return responseUtil.success(res, { id: result.id }, '创建站内信成功');
  } catch (error) {
    logger.error(`创建站内信失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 更新站内信
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { title, content, startTime, endTime } = req.body;
    
    // 验证ID
    if (!validatorUtil.isValidId(id)) {
      return responseUtil.badRequest(res, '无效的站内信ID');
    }
    
    // 检查站内信是否存在
    const existingMessage = await messageModel.getById(parseInt(id, 10));
    if (!existingMessage) {
      return responseUtil.notFound(res, '站内信不存在');
    }
    
    // 验证时间逻辑（如果都提供了的话）
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        return responseUtil.badRequest(res, '开始时间必须早于结束时间');
      }
    }
    
    // 更新站内信
    const success = await messageModel.update(parseInt(id, 10), {
      title,
      content,
      startTime,
      endTime
    });
    
    if (!success) {
      return responseUtil.serverError(res);
    }
    
    return responseUtil.success(res, null, '更新站内信成功');
  } catch (error) {
    logger.error(`更新站内信失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 删除站内信
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    
    // 验证ID
    if (!validatorUtil.isValidId(id)) {
      return responseUtil.badRequest(res, '无效的站内信ID');
    }
    
    // 检查站内信是否存在
    const existingMessage = await messageModel.getById(parseInt(id, 10));
    if (!existingMessage) {
      return responseUtil.notFound(res, '站内信不存在');
    }
    
    // 删除站内信
    const success = await messageModel.remove(parseInt(id, 10));
    
    if (!success) {
      return responseUtil.serverError(res);
    }
    
    return responseUtil.success(res, null, '删除站内信成功');
  } catch (error) {
    logger.error(`删除站内信失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getList,
  getById,
  create,
  update,
  remove
}; 