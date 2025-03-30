/**
 * 任务提交控制器
 * 处理H5端任务提交相关业务逻辑
 */
const submittedTaskModel = require('../../shared/models/submitted-task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');

/**
 * 提交任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function submitTask(req, res) {
  try {
    const { taskId, submitContent } = req.body;
    const memberId = req.user.id;
    
    if (!taskId) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    if (!submitContent) {
      return responseUtil.badRequest(res, '提交内容不能为空');
    }
    
    // 创建提交记录
    const result = await submittedTaskModel.create({
      taskId: parseInt(taskId, 10),
      memberId,
      submitContent
    });
    
    // 根据是否是重新提交返回不同的消息
    const message = result.isResubmit ? '任务重新提交成功' : '任务提交成功';
    
    return responseUtil.success(res, { id: result.id }, message);
  } catch (error) {
    logger.error(`任务提交失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '任务不存在' || 
        error.message === '只能提交进行中的任务' || 
        error.message === '会员不存在' || 
        error.message === '请先报名任务' || 
        error.message === '任务已提交，正在审核中' || 
        error.message === '任务已提交并已通过审核' ||
        error.message === '任务名额已满，无法提交') {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '任务提交失败，请稍后重试');
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
    const memberId = req.user.id;
    
    if (!id) {
      return responseUtil.badRequest(res, '提交ID不能为空');
    }
    
    // 获取提交详情
    const task = await submittedTaskModel.getById(parseInt(id, 10));
    
    if (!task) {
      return responseUtil.notFound(res, '未找到提交记录');
    }
    
    // 验证是否是当前会员的提交
    if (task.memberId !== memberId) {
      return responseUtil.forbidden(res, '无权查看此提交记录');
    }
    
    // 转换为前端需要的格式
    const responseData = {
      id: task.id,
      taskId: task.taskId,
      taskName: task.taskName,
      submitContent: task.submitContent,
      submitTime: task.submitTime,
      taskAuditStatus: task.taskAuditStatus,
      rejectReason: task.rejectReason
    };
    
    return responseUtil.success(res, responseData, '获取已提交任务详情成功');
  } catch (error) {
    logger.error(`获取已提交任务详情失败: ${error.message}`);
    return responseUtil.serverError(res, '获取已提交任务详情失败，请稍后重试');
  }
}

/**
 * 获取任务提交状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function checkSubmission(req, res) {
  try {
    const { taskId } = req.params;
    const memberId = req.user.id;
    
    if (!taskId) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 获取提交状态
    const submission = await submittedTaskModel.getByTaskAndMember(
      parseInt(taskId, 10),
      memberId
    );
    
    // 如果没有提交记录
    if (!submission) {
      return responseUtil.success(res, { 
        isSubmitted: false 
      }, '获取任务提交状态成功');
    }
    
    // 返回提交状态
    return responseUtil.success(res, {
      isSubmitted: true,
      id: submission.id,
      submitTime: submission.submitTime,
      taskAuditStatus: submission.taskAuditStatus,
      rejectReason: submission.rejectReason
    }, '获取任务提交状态成功');
  } catch (error) {
    logger.error(`获取任务提交状态失败: ${error.message}`);
    return responseUtil.serverError(res, '获取任务提交状态失败，请稍后重试');
  }
}

/**
 * 获取会员的所有已提交任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getMemberSubmittedTasks(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, taskAuditStatus } = req.query;
    const memberId = req.user.id;
    
    // 构建筛选条件
    const filters = {
      memberId,
      taskAuditStatus
    };
    
    // 记录日志，包括请求的筛选条件
    logger.info(`获取会员已提交任务列表 - 会员ID: ${memberId}, 审核状态筛选: ${taskAuditStatus || '全部'}`);
    
    // 获取提交列表
    const result = await submittedTaskModel.getList(
      filters,
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    // 记录查询结果
    logger.info(`会员已提交任务列表查询结果 - 会员ID: ${memberId}, 总数: ${result.total}, 当前页数据量: ${result.list.length}`);
    
    return responseUtil.success(res, result, '获取已提交任务列表成功');
  } catch (error) {
    logger.error(`获取已提交任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取已提交任务列表失败，请稍后重试');
  }
}

module.exports = {
  submitTask,
  getSubmittedTaskDetail,
  checkSubmission,
  getMemberSubmittedTasks
}; 