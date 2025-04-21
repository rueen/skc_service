/*
 * @Author: diaochan
 * @Date: 2025-04-18 10:02:28
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 22:01:13
 * @Description: 
 */
/**
 * 任务报名控制器
 * 处理H5端任务报名相关业务逻辑
 */
const enrolledTaskModel = require('../../shared/models/enrolled-task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

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
    
    // 确保响应使用驼峰格式
    const responseData = {
      id: result.id,
      // 其他可能的驼峰字段...
    };
    
    return responseUtil.success(res, responseData);
  } catch (error) {
    logger.error(`任务报名失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '任务不存在') {
      return responseUtil.badRequest(res, i18n.t('h5.task.notFound', req.lang));
    }
    if (error.message === '只能报名进行中的任务') {
      return responseUtil.badRequest(res, i18n.t('h5.task.onlyEnrollActiveTask', req.lang));
    }
    if (error.message === '会员不存在') {
      return responseUtil.badRequest(res, i18n.t('h5.task.memberNotFound', req.lang));
    }
    if (error.message === '已经报名过该任务') {
      return responseUtil.badRequest(res, i18n.t('h5.task.alreadyEnrolled', req.lang));
    }
    if (error.message.includes('该任务限')) {
      return responseUtil.badRequest(res, i18n.t('h5.task.notMeetEnrollCondition', req.lang));
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 获取已报名任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getEnrolledTasks(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, taskId, excludeSubmitted } = req.query;
    const memberId = req.user.id;
    
    // 添加调试日志，记录用户状态
    logger.info(`获取已报名任务列表API - 会员ID: ${memberId || '未登录'}, 是否排除已提交: ${excludeSubmitted === 'true'}`);
    
    // 获取已报名任务列表
    const result = await enrolledTaskModel.getListByMember(
      { 
        memberId, 
        taskId: taskId ? parseInt(taskId, 10) : undefined,
        excludeSubmitted: excludeSubmitted === 'true' // 将字符串参数转换为布尔值
      },
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    // 添加完整的调试日志，包括返回的任务数量
    logger.info(`已报名任务列表返回 - 会员ID: ${memberId}, 任务数量: ${result.list.length}, 是否排除已提交: ${excludeSubmitted === 'true'}`);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取已报名任务列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  enrollTask,
  getEnrolledTasks
}; 