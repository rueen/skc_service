/**
 * 已提交任务控制器 - 管理后台
 * 处理任务审核相关业务逻辑
 */
const submittedTaskModel = require('../../shared/models/submitted-task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取预审任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getPreAuditTasks(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      taskName, 
      channelId, 
      taskAuditStatus,
      taskPreAuditStatus,
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
    if (taskPreAuditStatus) filters.taskPreAuditStatus = taskPreAuditStatus;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    if (submitStartTime) filters.submitStartTime = submitStartTime;
    if (submitEndTime) filters.submitEndTime = submitEndTime;
    if (completedTaskCount) filters.completedTaskCount = completedTaskCount;
    
    // 获取已提交任务列表
    const result = await submittedTaskModel.getList(
      filters,
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取已提交任务列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取初审已通过的任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getConfirmAuditTasks(req, res) {
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
    if (completedTaskCount) filters.completedTaskCount = completedTaskCount;
    
    // 获取预审已通过的任务列表
    const result = await submittedTaskModel.getPreAuditedList(
      filters,
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取预审已通过任务列表失败: ${error.message}`);
    return responseUtil.serverError(res);
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
    const { auditType = 'confirm' } = req.query; // 默认为 'confirm'
    
    if (!id) {
      return responseUtil.badRequest(res, '提交ID不能为空');
    }
    
    // 获取提交详情
    const task = await submittedTaskModel.getById(parseInt(id, 10), auditType);
    
    if (!task) {
      return responseUtil.notFound(res, i18n.t('admin.submittedTask.notFound', req.lang));
    }
    
    return responseUtil.success(res, task);
  } catch (error) {
    logger.error(`获取已提交任务详情失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      i18n.t('admin.submittedTask.approveSuccess', req.lang, {
        updatedCount: result.updatedCount
      })
    );
  } catch (error) {
    logger.error(`批量审核通过任务失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      i18n.t('admin.submittedTask.rejectSuccess', req.lang, {
        updatedCount: result.updatedCount
      })
    );
  } catch (error) {
    logger.error(`批量拒绝任务失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 导出已提交任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportPreAuditTasks(req, res) {
  try {
    const { 
      taskName, 
      channelId, 
      taskAuditStatus,
      taskPreAuditStatus,
      groupId,
      submitStartTime,
      submitEndTime,
      completedTaskCount
    } = req.query;
    
    // 构建筛选条件
    const filters = {
      exportMode: true // 标记为导出模式，不使用分页
    };
    
    if (taskName) filters.taskName = taskName;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (taskAuditStatus) filters.taskAuditStatus = taskAuditStatus;
    if (taskPreAuditStatus) filters.taskPreAuditStatus = taskPreAuditStatus;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    if (submitStartTime) filters.submitStartTime = submitStartTime;
    if (submitEndTime) filters.submitEndTime = submitEndTime;
    if (completedTaskCount) filters.completedTaskCount = completedTaskCount;
    
    // 获取所有符合条件的任务提交记录
    const result = await submittedTaskModel.getList(filters);
    
    if (!result.list || result.list.length === 0) {
      return res.status(404).send('没有符合条件的已提交任务数据');
    }
    
    // 设置响应头，指定为 CSV 文件下载
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=submitted-tasks.csv');
    
    // CSV 表头
    const headers = [
      '提交时间', '任务名称', '平台渠道', '会员ID', '所属群组', 
      '初审状态', '初审员', '品牌', '提交内容'
    ];
    
    // 写入表头 (添加BOM以确保Excel正确识别UTF-8)
    res.write('\ufeff' + headers.join(',') + '\n');
    // 写入数据行
    result.list.forEach(item => {
      const values = [
        item.submitTime || '',
        item.taskName || '',
        item.channelName || '',
        item.memberId || '',
        item.groupName || '',
        getPreAuditStatusText(item.taskPreAuditStatus) || '',
        item.preWaiterName || '',
        item.brand || '',
        item.submitContent || ''
      ];
      
      res.write(values.join(',') + '\n');
    });
    
    return res.end();
  } catch (error) {
    logger.error(`导出已提交任务列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 导出预审已通过的任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportConfirmAuditTasks(req, res) {
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
    const filters = {
      exportMode: true, // 标记为导出模式，不使用分页
      taskPreAuditStatus: 'approved' // 固定为预审已通过
    };
    
    if (taskName) filters.taskName = taskName;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (taskAuditStatus) filters.taskAuditStatus = taskAuditStatus;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    if (submitStartTime) filters.submitStartTime = submitStartTime;
    if (submitEndTime) filters.submitEndTime = submitEndTime;
    if (completedTaskCount) filters.completedTaskCount = completedTaskCount;
    
    // 获取所有符合条件的预审已通过任务提交记录
    const result = await submittedTaskModel.getList(filters);
    
    if (!result.list || result.list.length === 0) {
      return res.status(404).send('没有符合条件的预审已通过任务数据');
    }
    
    // 设置响应头，指定为 CSV 文件下载
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=pre-audited-tasks.csv');
    
    // CSV 表头
    const headers = [
      '提交ID', '任务名称', '渠道', '会员昵称', '提交时间', 
      '预审状态', '初审员', '审核状态', '审核员', '已完成任务数', '群组'
    ];
    
    // 写入表头 (添加BOM以确保Excel正确识别UTF-8)
    res.write('\ufeff' + headers.join(',') + '\n');
    
    // 写入数据行
    result.list.forEach(item => {
      const values = [
        item.id || '',
        (item.taskName || '').replace(/,/g, '，'), // 替换逗号防止影响 CSV 格式
        (item.channelName || '').replace(/,/g, '，'),
        (item.memberNickname || '').replace(/,/g, '，'),
        (item.submitTime || '').replace(/,/g, '，'),
        '预审通过', // 固定值：预审通过
        (item.preWaiterName || '').replace(/,/g, '，'),
        (getAuditStatusText(item.taskAuditStatus) || '').replace(/,/g, '，'),
        (item.waiterName || '').replace(/,/g, '，'),
        item.completedTaskCount || 0,
        (item.groupName || '').replace(/,/g, '，')
      ];
      
      res.write(values.join(',') + '\n');
    });
    
    return res.end();
  } catch (error) {
    logger.error(`导出预审已通过任务列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 批量预审通过提交
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchPreApproveSubmissions(req, res) {
  try {
    const { ids } = req.body;
    const waiterId = req.user.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '请选择要预审通过的任务');
    }
    
    // 批量预审通过
    const result = await submittedTaskModel.batchPreApprove(ids, waiterId);
    
    return responseUtil.success(
      res, 
      { updatedCount: result.updatedCount },
      i18n.t('admin.submittedTask.preApproveSuccess', req.lang, {
        updatedCount: result.updatedCount
      })
    );
  } catch (error) {
    logger.error(`批量预审通过任务失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 批量预审拒绝提交
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchPreRejectSubmissions(req, res) {
  try {
    const { ids, reason } = req.body;
    const waiterId = req.user.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '请选择要预审拒绝的任务');
    }
    
    if (!reason) {
      return responseUtil.badRequest(res, '拒绝原因不能为空');
    }
    
    // 批量预审拒绝
    const result = await submittedTaskModel.batchPreReject(ids, reason, waiterId);
    
    return responseUtil.success(
      res, 
      { updatedCount: result.updatedCount },
      i18n.t('admin.submittedTask.preRejectSuccess', req.lang, {
        updatedCount: result.updatedCount
      })
    );
  } catch (error) {
    logger.error(`批量预审拒绝任务失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

// 获取审核状态对应的中文文本
function getAuditStatusText(status) {
  const statusMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return statusMap[status] || status;
}

// 获取预审状态对应的中文文本
function getPreAuditStatusText(status) {
  const statusMap = {
    'pending': '待预审',
    'approved': '预审通过',
    'rejected': '预审拒绝'
  };
  return statusMap[status] || status;
}

module.exports = {
  getPreAuditTasks,
  getConfirmAuditTasks, 
  getSubmittedTaskDetail,
  exportPreAuditTasks,
  exportConfirmAuditTasks,
  batchApproveSubmissions,
  batchRejectSubmissions,
  batchPreApproveSubmissions,
  batchPreRejectSubmissions
}; 