/**
 * H5端任务控制器
 * 处理H5端任务相关的业务逻辑
 */
const taskModel = require('../../models/task.model');
const taskSubmittedModel = require('../../models/taskSubmitted.model');
const { STATUS_CODES, MESSAGES } = require('../../config/api.config');
const logger = require('../../config/logger.config');

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
      taskStatus: 'processing' // 只显示进行中的任务
    };
    
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (category) filters.category = category;
    
    // 获取任务列表
    const result = await taskModel.getList(filters, page, pageSize);
    
    return res.json({
      code: STATUS_CODES.SUCCESS,
      message: MESSAGES.SUCCESS,
      data: result
    });
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    return res.status(500).json({
      code: STATUS_CODES.SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
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
      return res.status(404).json({
        code: STATUS_CODES.NOT_FOUND,
        message: '任务不存在'
      });
    }
    
    // 检查任务是否已结束
    if (task.taskStatus === 'ended') {
      return res.status(400).json({
        code: STATUS_CODES.BAD_REQUEST,
        message: '该任务已结束'
      });
    }
    
    return res.json({
      code: STATUS_CODES.SUCCESS,
      message: MESSAGES.SUCCESS,
      data: task
    });
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    return res.status(500).json({
      code: STATUS_CODES.SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
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
      return res.status(404).json({
        code: STATUS_CODES.NOT_FOUND,
        message: '任务不存在'
      });
    }
    
    // 检查任务是否已结束
    if (task.taskStatus === 'ended') {
      return res.status(400).json({
        code: STATUS_CODES.BAD_REQUEST,
        message: '该任务已结束，无法提交'
      });
    }
    
    // 检查是否已提交过该任务
    const existingSubmission = await taskSubmittedModel.getByTaskAndMember(parseInt(id, 10), memberId);
    
    if (existingSubmission) {
      return res.status(400).json({
        code: STATUS_CODES.BAD_REQUEST,
        message: '您已提交过该任务'
      });
    }
    
    // 提交任务
    const result = await taskSubmittedModel.create({
      taskId: parseInt(id, 10),
      memberId,
      submitContent,
      submitTime: new Date()
    });
    
    return res.json({
      code: STATUS_CODES.SUCCESS,
      message: '任务提交成功，请等待审核',
      data: result
    });
  } catch (error) {
    logger.error(`提交任务失败: ${error.message}`);
    return res.status(500).json({
      code: STATUS_CODES.SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
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
    
    return res.json({
      code: STATUS_CODES.SUCCESS,
      message: MESSAGES.SUCCESS,
      data: result
    });
  } catch (error) {
    logger.error(`获取已提交的任务列表失败: ${error.message}`);
    return res.status(500).json({
      code: STATUS_CODES.SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
  }
}

module.exports = {
  getList,
  getDetail,
  submitTask,
  getSubmittedList
}; 