/**
 * 已提交任务控制器 - 管理后台
 * 处理Support端任务审核相关业务逻辑
 */
const submittedTaskModel = require('../../shared/models/submitted-task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取已提交任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getSubmittedTasks(req, res) {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      taskName, 
      channelId, 
      taskAuditStatus,
      groupId 
    } = req.query;
    
    // 构建筛选条件
    const filters = {};
    
    if (taskName) filters.taskName = taskName;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (taskAuditStatus) filters.taskAuditStatus = taskAuditStatus;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    
    // 获取已提交任务列表
    const result = await submittedTaskModel.getList(
      filters,
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    return responseUtil.success(res, result, '获取已提交任务列表成功');
  } catch (error) {
    logger.error(`获取已提交任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取已提交任务列表失败，请稍后重试');
  }
}

/**
 * 获取已提交任务详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getSubmittedTaskDetail(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '提交ID不能为空');
    }
    
    // 获取提交详情
    const task = await submittedTaskModel.getById(parseInt(id, 10));
    
    if (!task) {
      return responseUtil.notFound(res, '未找到提交记录');
    }
    
    return responseUtil.success(res, task, '获取已提交任务详情成功');
  } catch (error) {
    logger.error(`获取已提交任务详情失败: ${error.message}`);
    return responseUtil.serverError(res, '获取已提交任务详情失败，请稍后重试');
  }
}

/**
 * 批量审核通过任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchApproveSubmissions(req, res) {
  try {
    const { ids } = req.body;
    const waiterId = req.user.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '请选择要审核的任务');
    }
    
    // 批量审核通过
    const result = await submittedTaskModel.batchApprove(ids, waiterId);
    
    return responseUtil.success(
      res, 
      { updatedCount: result.updatedCount }, 
      `成功审核通过 ${result.updatedCount} 个任务`
    );
  } catch (error) {
    logger.error(`批量审核通过任务失败: ${error.message}`);
    return responseUtil.serverError(res, '批量审核通过任务失败，请稍后重试');
  }
}

/**
 * 批量拒绝任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchRejectSubmissions(req, res) {
  try {
    const { ids, reason } = req.body;
    const waiterId = req.user.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '请选择要拒绝的任务');
    }
    
    if (!reason) {
      return responseUtil.badRequest(res, '拒绝原因不能为空');
    }
    
    // 批量拒绝
    const result = await submittedTaskModel.batchReject(ids, reason, waiterId);
    
    return responseUtil.success(
      res, 
      { updatedCount: result.updatedCount }, 
      `成功拒绝 ${result.updatedCount} 个任务`
    );
  } catch (error) {
    logger.error(`批量拒绝任务失败: ${error.message}`);
    return responseUtil.serverError(res, '批量拒绝任务失败，请稍后重试');
  }
}

module.exports = {
  getSubmittedTasks,
  getSubmittedTaskDetail,
  batchApproveSubmissions,
  batchRejectSubmissions
}; 