/**
 * H5端任务组控制器
 * 处理任务组相关的业务逻辑
 */
const taskGroupModel = require('../../shared/models/task-group.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取任务组详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetail(req, res) {
  try {
    const { id } = req.params;
    const memberId = req.user ? req.user.id : null;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务组ID不能为空');
    }
    
    const result = await taskGroupModel.getDetail(id, memberId);
    
    if (!result) {
      return responseUtil.notFound(res, i18n.t('h5.taskGroup.notFound', req.lang));
    }
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`H5端获取任务组详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取任务组已关联任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getRelatedTasks(req, res) {
  try {
    const { id } = req.params;
    const memberId = req.user.id;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务组ID不能为空');
    }
    
    const result = await taskGroupModel.getRelatedTasks(id, memberId);
    
    if (result === null) {
      return responseUtil.notFound(res, i18n.t('h5.taskGroup.notFound', req.lang));
    }
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`H5端获取任务组关联任务列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getDetail,
  getRelatedTasks
}; 