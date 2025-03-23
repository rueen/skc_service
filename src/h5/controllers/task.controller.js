/**
 * H5端任务控制器
 * 处理H5端任务相关的业务逻辑
 */
const taskModel = require('../../shared/models/task.model');
const taskSubmittedModel = require('../../shared/models/taskSubmitted.model');
const { STATUS_CODES, MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { page = 1, pageSize = 10, channelId, category } = req.query;
    const memberId = req.user ? req.user.id : null;
    
    // 添加调试日志，记录用户状态
    logger.info(`获取任务列表API - 是否有用户: ${req.user ? '是' : '否'}, 会员ID: ${memberId || '未登录'}`);
    
    // 构建筛选条件
    const filters = {
      taskStatusIn: ['not_started', 'processing'] // 显示未开始和进行中的任务
    };
    
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (category) filters.category = category;
    
    // 获取任务列表，传递memberId以检查报名状态
    const result = await taskModel.getList(filters, page, pageSize, memberId);
    
    // 添加完整的调试日志，包括返回的任务数量
    logger.info(`任务列表返回 - 会员ID: ${memberId || '未登录'}, 任务数量: ${result.list.length}`);
    
    return responseUtil.success(res, result, '获取任务列表成功');
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
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
    const memberId = req.user ? req.user.id : null;
    
    // 添加调试日志，记录用户状态
    logger.info(`获取任务详情API - 任务ID: ${id}, 是否有用户: ${req.user ? '是' : '否'}, 会员ID: ${memberId || '未登录'}`);
    
    // 获取任务详情，传递memberId以检查报名状态
    const task = await taskModel.getDetail(parseInt(id, 10), memberId);
    
    if (!task) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    // 检查任务是否已结束
    if (task.taskStatus === 'ended') {
      return responseUtil.badRequest(res, '该任务已结束');
    }
    
    // 添加完整的调试日志，包括报名状态
    logger.info(`任务详情返回 - 任务ID: ${id}, 会员ID: ${memberId || '未登录'}, 报名状态: ${task.isEnrolled}, 报名ID: ${task.enrollmentId || '无'}`);
    
    return responseUtil.success(res, task, '获取任务详情成功');
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 提交任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function submitTask(req, res) {
  try {
    const { id } = req.params;
    const { submitContent } = req.body;
    const memberId = req.user.id;
    
    if (!submitContent) {
      return responseUtil.badRequest(res, '提交内容不能为空');
    }
    
    // 获取任务详情
    const task = await taskModel.getDetail(parseInt(id, 10));
    
    if (!task) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    // 检查任务是否已结束
    if (task.taskStatus === 'ended') {
      return responseUtil.badRequest(res, '该任务已结束，无法提交');
    }
    
    // 检查是否已提交过该任务
    const existingSubmission = await taskSubmittedModel.getByTaskAndMember(parseInt(id, 10), memberId);
    
    if (existingSubmission) {
      return responseUtil.badRequest(res, '您已提交过该任务');
    }
    
    // 提交任务
    const result = await taskSubmittedModel.create({
      taskId: parseInt(id, 10),
      memberId,
      submitContent,
      submitTime: new Date()
    });
    
    return responseUtil.success(res, result, '任务提交成功，请等待审核');
  } catch (error) {
    logger.error(`提交任务失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 获取已提交的任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getSubmittedList(req, res) {
  try {
    const { page = 1, pageSize = 10, taskAuditStatus } = req.query;
    const memberId = req.user.id;
    
    // 构建筛选条件
    const filters = {
      memberId
    };
    
    if (taskAuditStatus) filters.taskAuditStatus = taskAuditStatus;
    
    // 获取已提交的任务列表
    const result = await taskSubmittedModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取已提交的任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

module.exports = {
  getList,
  getDetail,
  submitTask,
  getSubmittedList
}; 