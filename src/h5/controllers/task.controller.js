/**
 * H5端任务控制器
 * 处理H5端任务相关的业务逻辑
 */
const taskModel = require('../../shared/models/task.model');
const taskSubmittedModel = require('../../shared/models/taskSubmitted.model');
const taskApplicationModel = require('../../shared/models/taskApplication.model');
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
    
    // 构建筛选条件
    const filters = {
      taskStatusIn: ['not_started', 'processing'] // 显示未开始和进行中的任务
    };
    
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (category) filters.category = category;
    
    // 获取任务列表
    const result = await taskModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, result);
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
    
    // 获取任务详情
    const task = await taskModel.getById(parseInt(id, 10));
    
    if (!task) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    // 检查任务是否已结束
    if (task.taskStatus === 'ended') {
      return responseUtil.badRequest(res, '该任务已结束');
    }
    
    return responseUtil.success(res, task);
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 报名任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function applyTask(req, res) {
  try {
    const { id } = req.params;
    const memberId = req.user.id;
    
    // 获取任务详情
    const task = await taskModel.getById(parseInt(id, 10));
    
    if (!task) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    // 检查任务状态
    if (task.taskStatus === 'ended') {
      return responseUtil.badRequest(res, '该任务已结束，无法报名');
    }
    
    if (task.taskStatus === 'not_started') {
      return responseUtil.badRequest(res, '该任务尚未开始，无法报名');
    }
    
    // 检查是否已报名
    const existingApplication = await taskApplicationModel.getByTaskAndMember(parseInt(id, 10), memberId);
    if (existingApplication) {
      return responseUtil.badRequest(res, '您已报名过该任务');
    }
    
    // 报名任务
    const result = await taskApplicationModel.create({
      taskId: parseInt(id, 10),
      memberId
    });
    
    return responseUtil.success(res, result, '任务报名成功');
  } catch (error) {
    logger.error(`报名任务失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 获取已报名的任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAppliedList(req, res) {
  try {
    const { page = 1, pageSize = 10, status } = req.query;
    const memberId = req.user.id;
    
    // 构建筛选条件
    const filters = {
      memberId
    };
    
    if (status) filters.status = status;
    
    // 获取已报名的任务列表
    const result = await taskApplicationModel.getList(filters, page, pageSize);
    
    // 如果status是submitted，为已提交的任务添加审核状态信息
    if (status === 'submitted' || !status) {
      // 查询每个已提交任务的审核状态
      for (const item of result.list) {
        if (item.status === 'submitted') {
          const submission = await taskSubmittedModel.getByTaskAndMember(item.taskId, memberId);
          if (submission) {
            item.taskAuditStatus = submission.taskAuditStatus;
            item.submitTime = submission.submitTime;
          }
        }
      }
    }
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取已报名的任务列表失败: ${error.message}`);
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
    
    // 获取任务详情
    const task = await taskModel.getById(parseInt(id, 10));
    
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
      return res.status(400).json({
        code: STATUS_CODES.BAD_REQUEST,
        message: '您已提交过该任务'
      });
    }
    
    // 检查是否已报名该任务
    const application = await taskApplicationModel.getByTaskAndMember(parseInt(id, 10), memberId);
    if (!application) {
      // 如果没有报名，返回错误，不允许提交
      return responseUtil.badRequest(res, '您尚未报名该任务，请先报名后再提交');
    }
    
    // 提交任务
    const result = await taskSubmittedModel.create({
      taskId: parseInt(id, 10),
      memberId,
      submitContent,
      submitTime: new Date()
    });
    
    // 更新任务报名状态为已提交
    await taskApplicationModel.updateStatusByTaskAndMember(parseInt(id, 10), memberId, 'submitted');
    
    return responseUtil.success(res, result, '任务提交成功，请等待审核');
  } catch (error) {
    logger.error(`提交任务失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

module.exports = {
  getList,
  getDetail,
  applyTask,
  getAppliedList,
  submitTask
}; 