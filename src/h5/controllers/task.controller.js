/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 22:12:27
 * @Description: 
 */
/**
 * H5端任务控制器
 * 处理H5端任务相关的业务逻辑
 */
const taskModel = require('../../shared/models/task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, channelId, category } = req.query;
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
    
    // 如果用户已登录，过滤掉已报名的任务
    if (memberId) {
      const originalCount = result.list.length;
      result.list = result.list.filter(task => !task.isEnrolled);
      const filteredCount = originalCount - result.list.length;
      
      // 更新总数，减去过滤掉的任务数
      result.total = Math.max(0, result.total - filteredCount);
      
      logger.info(`过滤已报名任务 - 会员ID: ${memberId}, 过滤前: ${originalCount}, 过滤后: ${result.list.length}, 过滤数量: ${filteredCount}`);
    }
    
    // 添加完整的调试日志，包括返回的任务数量
    logger.info(`任务列表返回 - 会员ID: ${memberId || '未登录'}, 任务数量: ${result.list.length}`);
    
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
    const memberId = req.user ? req.user.id : null;
    
    // 添加调试日志，记录用户状态
    logger.info(`获取任务详情API - 任务ID: ${id}, 是否有用户: ${req.user ? '是' : '否'}, 会员ID: ${memberId || '未登录'}`);
    
    // 获取任务详情，传递memberId以检查报名状态
    const task = await taskModel.getDetail(parseInt(id, 10), memberId);
    
    if (!task) {
      return responseUtil.notFound(res, i18n.t('h5.task.notFound', req.lang));
    }
    
    // 检查任务是否已结束
    // if (task.taskStatus === 'ended') {
    //   return responseUtil.badRequest(res, '该任务已结束');
    // }
    
    // 添加完整的调试日志，包括报名状态
    logger.info(`任务详情返回 - 任务ID: ${id}, 会员ID: ${memberId || '未登录'}, 报名状态: ${task.isEnrolled}, 报名ID: ${task.enrollmentId || '无'}`);
    
    return responseUtil.success(res, task);
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getList,
  getDetail
}; 