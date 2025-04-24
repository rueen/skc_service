/**
 * 任务控制器
 * 处理任务相关的业务逻辑
 */
const taskModel = require('../../shared/models/task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, taskName, taskStatus, channelId } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (taskName) filters.taskName = taskName;
    if (taskStatus) filters.taskStatus = taskStatus;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    
    // 获取任务列表
    const result = await taskModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取任务详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetail(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    const result = await taskModel.getDetail(id);
    
    if (!result) {
      return responseUtil.notFound(res, i18n.t('admin.task.notFound', req.lang));
    }
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 创建任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function create(req, res) {
  try {
    // 验证必要参数
    const { taskName, startTime, endTime, reward, channelId } = req.body;
    
    if (!taskName || !startTime || !endTime || !reward || !channelId) {
      return responseUtil.badRequest(res, '缺少必要参数');
    }
    
    // 创建任务
    const result = await taskModel.create(req.body);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`创建任务失败: ${error.message}`);
    
    if (error.message.includes('已存在')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 更新任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 检查任务是否存在
    const task = await taskModel.getDetail(id);
    
    if (!task) {
      return responseUtil.notFound(res, i18n.t('admin.task.notFound', req.lang));
    }
    
    // 验证必要参数
    const { taskName, startTime, endTime, reward } = req.body;
    
    if (!taskName || !startTime || !endTime || !reward) {
      return responseUtil.badRequest(res, '缺少必要参数');
    }
    
    // 更新任务
    const result = await taskModel.update({
      id,
      ...req.body
    });
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`更新任务失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 删除任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 检查任务是否存在
    const task = await taskModel.getDetail(id);
    
    if (!task) {
      return responseUtil.notFound(res, i18n.t('admin.task.notFound', req.lang));
    }
    
    // 删除任务
    const result = await taskModel.remove(id);
    
    return responseUtil.success(res, { success: result });
  } catch (error) {
    logger.error(`删除任务失败: ${error.message}`);
    return responseUtil.serverError(res, error.message);
  }
}

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove
}; 