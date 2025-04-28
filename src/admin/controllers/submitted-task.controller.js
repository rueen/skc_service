/**
 * 已提交任务控制器 - 管理后台
 * 处理任务审核相关业务逻辑
 */
const submittedTaskModel = require('../../shared/models/submitted-task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');
const Excel = require('exceljs');

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
      completedTaskCount,
      preWaiterId
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
    if (preWaiterId) filters.preWaiterId = parseInt(preWaiterId, 10);
    
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
      completedTaskCount,
      waiterId,
      preWaiterId
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
    if (waiterId) filters.waiterId = parseInt(waiterId, 10);
    if (preWaiterId) filters.preWaiterId = parseInt(preWaiterId, 10);
    
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
    const { id, auditType = 'confirm', filtersParam = {} } = req.body;
    
    if (!id) {
      return responseUtil.badRequest(res, '提交ID不能为空');
    }
    
    // 处理filtersParam中的数字类型参数
    if (filtersParam.channelId) filtersParam.channelId = parseInt(filtersParam.channelId, 10);
    if (filtersParam.groupId) filtersParam.groupId = parseInt(filtersParam.groupId, 10);
    if (filtersParam.preWaiterId !== undefined) filtersParam.preWaiterId = parseInt(filtersParam.preWaiterId, 10);
    if (filtersParam.waiterId !== undefined) filtersParam.waiterId = parseInt(filtersParam.waiterId, 10);
    if (filtersParam.completedTaskCount) filtersParam.completedTaskCount = parseInt(filtersParam.completedTaskCount, 10);
    
    // 获取提交详情
    const task = await submittedTaskModel.getById(parseInt(id, 10), auditType, filtersParam);
    
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
    
    if(!result) {
      return responseUtil.badRequest(res, i18n.t('admin.submittedTask.noTasks', req.lang));
    }

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
    
    if(!result) {
      return responseUtil.badRequest(res, i18n.t('admin.submittedTask.noTasks', req.lang));
    }

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
      completedTaskCount,
      preWaiterId
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
    if (preWaiterId) filters.preWaiterId = parseInt(preWaiterId, 10);
    
    // 获取所有符合条件的任务提交记录
    const result = await submittedTaskModel.getList(filters);
    
    if (!result.list || result.list.length === 0) {
      return res.status(404).send('没有符合条件的已提交任务数据');
    }
    
    // 创建Excel工作簿和工作表
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('已提交任务');
    
    // 设置列定义和宽度
    worksheet.columns = [
      { header: '提交时间', key: 'submitTime', width: 20 },
      { header: '任务名称', key: 'taskName', width: 20 },
      { header: '平台渠道', key: 'channelName', width: 15 },
      { header: '会员ID', key: 'nickname', width: 15 },
      { header: '是否新用户', key: 'isNew', width: 15 },
      { header: '所属群组', key: 'groupName', width: 15 },
      { header: '初审状态', key: 'preAuditStatus', width: 10 },
      { header: '初审员', key: 'preWaiterName', width: 10 },
      { header: '品牌', key: 'brand', width: 10 },
      { header: '提交内容', key: 'submitContent', width: 60 }
    ];
    
    // 添加数据行
    result.list.forEach(item => {
      // 解析和格式化submitContent
      let formattedContent = '';
      try {
        if (item.submitContent) {
          const contentObj = typeof item.submitContent === 'string' 
            ? JSON.parse(item.submitContent) 
            : item.submitContent;
            
          if (contentObj.customFields && Array.isArray(contentObj.customFields)) {
            for (let i = 0; i < contentObj.customFields.length; i++) {
              const field = contentObj.customFields[i];
              
              // 添加字段标题
              formattedContent += field.title + ':';
              
              // 处理不同类型的字段
              if (field.type === 'image' && Array.isArray(field.value)) {
                // 图片类型：展开所有URL，每个URL单独一行
                field.value.forEach((img, index) => {
                  formattedContent += (index === 0 ? '' : '\n') + img.url;
                });
              } else {
                // 其他类型（如链接）：直接添加值
                formattedContent += field.value;
              }
              
              // 字段之间添加换行
              if (i < contentObj.customFields.length - 1) {
                formattedContent += '\n';
              }
            }
          }
        }
      } catch (err) {
        logger.error(`解析submitContent失败: ${err.message}`);
        formattedContent = String(item.submitContent || '');
      }
      
      // 确保formattedContent是字符串
      if (typeof formattedContent !== 'string') {
        formattedContent = String(formattedContent);
      }
      
      // 添加一行数据
      worksheet.addRow({
        submitTime: item.submitTime || '',
        taskName: item.taskName || '',
        channelName: item.channelName || '',
        nickname: item.nickname || '',
        isNew: item.isNew ? '是' : '否',
        groupName: item.groupName || '',
        preAuditStatus: getPreAuditStatusText(item.taskPreAuditStatus) || '',
        preWaiterName: item.preWaiterName || '',
        brand: item.brand || '',
        submitContent: formattedContent
      });
    });
    
    // 设置提交内容列的换行属性
    worksheet.getColumn('submitContent').eachCell({ includeEmpty: false }, cell => {
      cell.alignment = {
        wrapText: true,
        vertical: 'top'
      };
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=submitted-tasks.xlsx');
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
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
      completedTaskCount,
      waiterId,
      preWaiterId
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
    if (waiterId) filters.waiterId = parseInt(waiterId, 10);
    if (preWaiterId) filters.preWaiterId = parseInt(preWaiterId, 10);
    
    // 获取所有符合条件的预审已通过任务提交记录
    const result = await submittedTaskModel.getList(filters);
    
    if (!result.list || result.list.length === 0) {
      return res.status(404).send('没有符合条件的预审已通过任务数据');
    }
    
    // 创建Excel工作簿和工作表
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('预审已通过任务');

    // 设置列定义和宽度
    worksheet.columns = [
      { header: '提交时间', key: 'submitTime', width: 20 },
      { header: '任务名称', key: 'taskName', width: 20 },
      { header: '平台渠道', key: 'channelName', width: 15 },
      { header: '会员ID', key: 'nickname', width: 15 },
      { header: '是否新用户', key: 'isNew', width: 15 },
      { header: '所属群组', key: 'groupName', width: 15 },
      { header: '初审状态', key: 'preAuditStatus', width: 10 },
      { header: '初审员', key: 'preWaiterName', width: 10 },
      { header: '审核状态', key: 'auditStatus', width: 10 },
      { header: '审核员', key: 'waiterName', width: 10 },
      { header: '品牌', key: 'brand', width: 10 },
      { header: '提交内容', key: 'submitContent', width: 60 }
    ];
    
    // 添加数据行
    result.list.forEach(item => {
      // 解析和格式化submitContent
      let formattedContent = '';
      try {
        if (item.submitContent) {
          const contentObj = typeof item.submitContent === 'string' 
            ? JSON.parse(item.submitContent) 
            : item.submitContent;
            
          if (contentObj.customFields && Array.isArray(contentObj.customFields)) {
            for (let i = 0; i < contentObj.customFields.length; i++) {
              const field = contentObj.customFields[i];
              
              // 添加字段标题
              formattedContent += field.title + ':';
              
              // 处理不同类型的字段
              if (field.type === 'image' && Array.isArray(field.value)) {
                // 图片类型：展开所有URL，每个URL单独一行
                field.value.forEach((img, index) => {
                  formattedContent += (index === 0 ? '' : '\n') + img.url;
                });
              } else {
                // 其他类型（如链接）：直接添加值
                formattedContent += field.value;
              }
              
              // 字段之间添加换行
              if (i < contentObj.customFields.length - 1) {
                formattedContent += '\n';
              }
            }
          }
        }
      } catch (err) {
        logger.error(`解析submitContent失败: ${err.message}`);
        formattedContent = String(item.submitContent || '');
      }
      
      // 确保formattedContent是字符串
      if (typeof formattedContent !== 'string') {
        formattedContent = String(formattedContent);
      }
      
      // 添加一行数据
      worksheet.addRow({
        submitTime: item.submitTime || '',
        taskName: item.taskName || '',
        channelName: item.channelName || '',
        nickname: item.nickname || '',
        isNew: item.isNew ? '是' : '否',
        groupName: item.groupName || '',
        preAuditStatus: getPreAuditStatusText(item.taskPreAuditStatus) || '',
        preWaiterName: item.preWaiterName || '',
        auditStatus: getAuditStatusText(item.taskAuditStatus) || '',
        waiterName: item.waiterName || '',
        brand: item.brand || '',
        submitContent: formattedContent
      });
    });

    // 设置提交内容列的换行属性
    worksheet.getColumn('submitContent').eachCell({ includeEmpty: false }, cell => {
      cell.alignment = {
        wrapText: true,
        vertical: 'top'
      };
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pre-audited-tasks.xlsx');
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
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
    
    if(!result) {
      return responseUtil.badRequest(res, i18n.t('admin.submittedTask.noTasks', req.lang));
    }
    
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
    
    if(!result) {
      return responseUtil.badRequest(res, i18n.t('admin.submittedTask.noTasks', req.lang));
    }
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
    'approved': '初审通过',
    'rejected': '初审拒绝'
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