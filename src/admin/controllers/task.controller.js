/**
 * 任务控制器
 * 处理任务相关的业务逻辑
 */
const taskModel = require('../../shared/models/task.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');

/**
 * 获取任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, taskName, taskStatus, channelId } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (taskName) filters.taskName = taskName;
    if (taskStatus) filters.taskStatus = taskStatus;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    
    // 获取任务列表
    const result = await taskModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, result, '获取任务列表成功');
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取任务列表失败，请稍后重试');
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
    
    if (!id) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    const result = await taskModel.getDetail(id);
    
    if (!result) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    return responseUtil.success(res, result, '获取任务详情成功');
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    return responseUtil.serverError(res, '获取任务详情失败，请稍后重试');
  }
}

/**
 * 创建任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function create(req, res) {
  try {
    // 验证必要参数
    const { taskName, startTime, endTime, reward, channelId } = req.body;
    
    if (!taskName || !startTime || !endTime || !reward || !channelId) {
      return responseUtil.badRequest(res, '缺少必要参数');
    }
    
    // 创建任务
    const result = await taskModel.create(req.body);
    
    return responseUtil.success(res, result, '创建任务成功');
  } catch (error) {
    logger.error(`创建任务失败: ${error.message}`);
    
    if (error.message.includes('已存在')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '创建任务失败，请稍后重试');
  }
}

/**
 * 更新任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 检查任务是否存在
    const task = await taskModel.getDetail(id);
    
    if (!task) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    // 验证必要参数
    const { taskName, startTime, endTime, reward } = req.body;
    
    if (!taskName || !startTime || !endTime || !reward) {
      return responseUtil.badRequest(res, '缺少必要参数');
    }
    
    // 更新任务
    const result = await taskModel.update(id, req.body);
    
    return responseUtil.success(res, result, '更新任务成功');
  } catch (error) {
    logger.error(`更新任务失败: ${error.message}`);
    return responseUtil.serverError(res, '更新任务失败，请稍后重试');
  }
}

/**
 * 删除任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 检查任务是否存在
    const task = await taskModel.getDetail(id);
    
    if (!task) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    // 删除任务
    const result = await taskModel.remove(id);
    
    return responseUtil.success(res, { success: result }, '删除任务成功');
  } catch (error) {
    logger.error(`删除任务失败: ${error.message}`);
    return responseUtil.serverError(res, '删除任务失败，请稍后重试');
  }
}

/**
 * 导出任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportTasks(req, res) {
  try {
    const { taskName, taskStatus, channelId, startDate, endDate } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (taskName) filters.taskName = taskName;
    if (taskStatus) filters.taskStatus = taskStatus;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    // 导出任务列表
    const tasks = await taskModel.exportTasks(filters);
    
    if (!tasks || tasks.length === 0) {
      return res.status(404).send('没有符合条件的任务数据');
    }
    
    // 设置响应头，指定为 CSV 文件下载
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    
    // CSV 表头
    const headers = [
      'ID', '任务名称', '任务状态', '渠道ID', '渠道名称', '奖励金额', 
      '分类', '任务类型', '品牌', '粉丝要求', '开始时间', '结束时间',
      '无限名额', '名额数', '任务数量', '群组模式', '用户范围', 
      '内容要求', '创建时间', '更新时间'
    ];
    
    // 写入表头，添加BOM标记以确保Excel正确识别中文
    res.write('\ufeff' + headers.join(',') + '\n');
    
    // 写入数据行
    tasks.forEach(item => {
      const values = [
        item.id || '',
        (item.taskName || '').replace(/,/g, '，'), // 替换逗号防止影响 CSV 格式
        (item.taskStatus || '').replace(/,/g, '，'),
        item.channelId || '',
        (item.channelName || '').replace(/,/g, '，'),
        item.reward || '',
        (item.category || '').replace(/,/g, '，'),
        (item.taskType || '').replace(/,/g, '，'),
        (item.brand || '').replace(/,/g, '，'),
        item.fansRequired || '',
        (item.startTime || '').replace(/,/g, '，'),
        (item.endTime || '').replace(/,/g, '，'),
        item.unlimitedQuota ? '是' : '否',
        item.quota || '',
        item.taskCount || '',
        (item.groupMode || '').replace(/,/g, '，'),
        (item.userRange || '').replace(/,/g, '，'),
        (item.contentRequirement || '').replace(/,/g, '，'),
        (item.createTime || '').replace(/,/g, '，'),
        (item.updateTime || '').replace(/,/g, '，')
      ];
      
      res.write(values.join(',') + '\n');
    });
    
    return res.end();
  } catch (error) {
    logger.error(`导出任务列表失败: ${error.message}`);
    return responseUtil.serverError(res, '导出任务列表失败，请稍后重试');
  }
}

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove,
  exportTasks
}; 