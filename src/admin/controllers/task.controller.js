/**
 * 任务控制器
 * 处理任务相关的业务逻辑
 */
const taskModel = require('../../shared/models/task.model');
const { SUCCESS, BAD_REQUEST, NOT_FOUND, SERVER_ERROR } = require('../../shared/config/api.config').STATUS_CODES;
const { MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { page = 1, pageSize = 10, taskName, taskStatus, channelId } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (taskName) filters.taskName = taskName;
    if (taskStatus) filters.taskStatus = taskStatus;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    
    // 获取任务列表
    const result = await taskModel.getList(filters, page, pageSize);
    
    return res.json({
      code: SUCCESS,
      message: MESSAGES.SUCCESS,
      data: result
    });
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    return res.status(500).json({
      code: SERVER_ERROR,
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
    const task = await taskModel.getDetail(parseInt(id, 10));
    
    if (!task) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    return responseUtil.success(res, task);
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 创建任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function create(req, res) {
  try {
    const taskData = req.body;
    
    // 创建任务
    const result = await taskModel.create(taskData);
    
    return res.json({
      code: SUCCESS,
      message: '创建任务成功',
      data: result
    });
  } catch (error) {
    logger.error(`创建任务失败: ${error.message}`);
    return res.status(400).json({
      code: BAD_REQUEST,
      message: error.message || '创建任务失败'
    });
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
    const taskData = {
      ...req.body,
      id: parseInt(id, 10)
    };
    
    // 更新任务
    const success = await taskModel.update(taskData);
    
    if (!success) {
      return res.status(404).json({
        code: NOT_FOUND,
        message: '任务不存在或更新失败'
      });
    }
    
    return res.json({
      code: SUCCESS,
      message: '更新任务成功'
    });
  } catch (error) {
    logger.error(`更新任务失败: ${error.message}`);
    return res.status(400).json({
      code: BAD_REQUEST,
      message: error.message || '更新任务失败'
    });
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
    
    // 删除任务
    const success = await taskModel.remove(parseInt(id, 10));
    
    if (!success) {
      return res.status(404).json({
        code: NOT_FOUND,
        message: '任务不存在或删除失败'
      });
    }
    
    return res.json({
      code: SUCCESS,
      message: '删除任务成功'
    });
  } catch (error) {
    logger.error(`删除任务失败: ${error.message}`);
    return res.status(400).json({
      code: BAD_REQUEST,
      message: error.message || '删除任务失败'
    });
  }
}

/**
 * 导出任务数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportTasks(req, res) {
  try {
    const { taskName, taskStatus, channelId } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (taskName) filters.taskName = taskName;
    if (taskStatus) filters.taskStatus = taskStatus;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    
    // 获取所有符合条件的任务（不分页）
    const result = await taskModel.getList(filters, 1, 1000);
    
    // 构建CSV数据
    const fields = [
      { label: '任务ID', value: 'id' },
      { label: '任务名称', value: 'taskName' },
      { label: '渠道', value: 'channelName' },
      { label: '任务状态', value: 'taskStatus' },
      { label: '创建时间', value: 'createTime' }
    ];
    
    // 将任务状态转换为中文
    const taskStatusMap = {
      'not_started': '未开始',
      'processing': '进行中',
      'ended': '已结束'
    };
    
    const csvData = result.list.map(task => ({
      ...task,
      taskStatus: taskStatusMap[task.taskStatus] || task.taskStatus
    }));
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    
    // 生成CSV头
    const header = fields.map(field => field.label).join(',') + '\n';
    res.write(Buffer.from('\uFEFF' + header)); // 添加BOM，解决中文乱码问题
    
    // 生成CSV内容
    csvData.forEach(task => {
      const row = fields.map(field => {
        const value = task[field.value] || '';
        // 如果值包含逗号，用双引号包裹
        return value.toString().includes(',') ? `"${value}"` : value;
      }).join(',');
      res.write(row + '\n');
    });
    
    res.end();
  } catch (error) {
    logger.error(`导出任务数据失败: ${error.message}`);
    return res.status(500).json({
      code: SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
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