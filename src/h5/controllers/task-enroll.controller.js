/**
 * 任务报名控制器
 * 处理H5端任务报名相关业务逻辑
 */
const enrolledTaskModel = require('../../shared/models/enrolled-task.model');
const logger = require('../../shared/config/logger.config');
const { STATUS_CODES, MESSAGES } = require('../../shared/config/api.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 报名任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function enrollTask(req, res) {
  try {
    const { taskId } = req.params;
    const memberId = req.user.id;
    
    if (!taskId) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 创建报名记录
    const result = await enrolledTaskModel.create({
      taskId: parseInt(taskId, 10),
      memberId
    });
    
    return responseUtil.success(res, result, '任务报名成功');
  } catch (error) {
    logger.error(`任务报名失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '任务不存在' || 
        error.message === '只能报名进行中的任务' || 
        error.message === '会员不存在' || 
        error.message === '已经报名过该任务') {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '任务报名失败，请稍后重试');
  }
}

/**
 * 获取已报名任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getEnrolledTasks(req, res) {
  try {
    const { page = 1, pageSize = 10, taskId } = req.query;
    const memberId = req.user.id;
    
    // 获取已报名任务列表
    const result = await enrolledTaskModel.getListByMember(
      { memberId, taskId: taskId ? parseInt(taskId, 10) : undefined },
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    return responseUtil.success(res, result, '获取已报名任务列表成功');
  } catch (error) {
    logger.error(`获取已报名任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取已报名任务列表失败，请稍后重试');
  }
}

/**
 * 取消任务报名
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function cancelEnrollment(req, res) {
  try {
    const { taskId } = req.params;
    const memberId = req.user.id;
    
    if (!taskId) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 取消报名
    const result = await enrolledTaskModel.cancel(parseInt(taskId, 10), memberId);
    
    return responseUtil.success(res, { success: result }, '取消任务报名成功');
  } catch (error) {
    logger.error(`取消任务报名失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '未报名该任务') {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '取消任务报名失败，请稍后重试');
  }
}

/**
 * 检查是否已报名任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function checkEnrollment(req, res) {
  try {
    const { taskId } = req.params;
    const memberId = req.user.id;
    
    if (!taskId) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 检查是否已报名
    const enrollment = await enrolledTaskModel.checkEnrollment(parseInt(taskId, 10), memberId);
    
    return responseUtil.success(
      res, 
      {
        isEnrolled: enrollment.isEnrolled,
        enrollmentId: enrollment.isEnrolled ? enrollment.enrollmentId : null
      }, 
      '检查是否已报名任务成功'
    );
  } catch (error) {
    logger.error(`检查是否已报名任务失败: ${error.message}`);
    return responseUtil.serverError(res, '检查是否已报名任务失败，请稍后重试');
  }
}

module.exports = {
  enrollTask,
  getEnrolledTasks,
  cancelEnrollment,
  checkEnrollment
}; 