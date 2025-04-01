/**
 * 已提交任务控制器 - 管理后台
 * 处理任务审核相关业务逻辑
 */
const submittedTaskModel = require('../../shared/models/submitted-task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');

/**
 * 获取已提交任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getSubmittedTasks(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      taskName, 
      channelId, 
      taskAuditStatus,
      groupId,
      submitStartTime,
      submitEndTime,
      completedTaskCount
    } = req.query;
    
    // 构建筛选条件
    const filters = {};
    
    if (taskName) filters.taskName = taskName;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (taskAuditStatus) filters.taskAuditStatus = taskAuditStatus;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    if (submitStartTime) filters.submitStartTime = submitStartTime;
    if (submitEndTime) filters.submitEndTime = submitEndTime;
    if (completedTaskCount !== undefined) filters.completedTaskCount = parseInt(completedTaskCount, 10);
    
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

/**
 * 导出已提交任务列表为CSV
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportSubmittedTasks(req, res) {
  try {
    const { 
      taskName, 
      channelId, 
      taskAuditStatus,
      groupId,
      submitStartTime,
      submitEndTime,
      completedTaskCount
    } = req.query;
    
    // 构建筛选条件
    const filters = {};
    
    if (taskName) filters.taskName = taskName;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (taskAuditStatus) filters.taskAuditStatus = taskAuditStatus;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    if (submitStartTime) filters.submitStartTime = submitStartTime;
    if (submitEndTime) filters.submitEndTime = submitEndTime;
    if (completedTaskCount !== undefined) filters.completedTaskCount = parseInt(completedTaskCount, 10);
    
    // 获取任务列表
    const submittedTasks = await submittedTaskModel.exportSubmittedTasks(filters);
    
    if (!submittedTasks || submittedTasks.length === 0) {
      return res.status(404).send('没有符合条件的任务数据');
    }
    
    // 设置响应头，指定为 CSV 文件下载
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=submitted-tasks.csv');
    
    // CSV 表头
    let headers = [
      'ID', '任务ID', '任务名称', '会员ID', '会员昵称', '渠道名称', '奖励积分'
    ];
    
    // 如果包含已完成任务数量的筛选条件，添加该字段到表头
    if (filters.completedTaskCount !== undefined) {
      headers.push('已完成任务次数');
    }
    
    // 添加其他表头字段
    headers = headers.concat([
      '审核状态', '拒绝原因', '提交时间', '审核员ID', '群组名称', '更新时间'
    ]);
    
    // 写入表头（添加 BOM 以支持中文）
    res.write('\ufeff' + headers.join(',') + '\n');
    
    // 写入数据行
    submittedTasks.forEach(item => {
      let values = [
        item.id || '',
        item.taskId || '',
        (item.taskName || '').replace(/,/g, '，'), // 替换逗号防止影响 CSV 格式
        item.memberId || '',
        (item.memberNickname || '').replace(/,/g, '，'),
        (item.channelName || '').replace(/,/g, '，'),
        item.reward || ''
      ];
      
      // 如果包含已完成任务数量的筛选条件，添加该字段到数据行
      if (filters.completedTaskCount !== undefined) {
        values.push(item.completedTaskCount || '0');
      }
      
      // 添加其他字段
      values = values.concat([
        (item.taskAuditStatus || '').replace(/,/g, '，'),
        (item.rejectReason || '').replace(/,/g, '，'),
        (item.submitTime || '').replace(/,/g, '，'),
        item.waiterId || '',
        (item.groupName || '').replace(/,/g, '，'),
        (item.updateTime || '').replace(/,/g, '，')
      ]);
      
      res.write(values.join(',') + '\n');
    });
    
    return res.end();
  } catch (error) {
    logger.error(`导出已提交任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, '导出已提交任务列表失败，请稍后重试');
  }
}

module.exports = {
  getSubmittedTasks,
  getSubmittedTaskDetail,
  batchApproveSubmissions,
  batchRejectSubmissions,
  exportSubmittedTasks
}; 