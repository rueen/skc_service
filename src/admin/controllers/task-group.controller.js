/**
 * 任务组控制器
 * 处理任务组相关的业务逻辑
 */
const taskGroupModel = require('../../shared/models/task-group.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取任务组列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      taskGroupName, 
      taskName,
      sorterField,
      sorterOrder 
    } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (taskGroupName) filters.taskGroupName = taskGroupName;
    if (taskName) filters.taskName = taskName;
    
    // 构建排序条件
    const sortOptions = {};
    if (sorterField && sorterOrder) {
      sortOptions.field = sorterField;
      sortOptions.order = sorterOrder;
    }
    
    // 获取任务组列表
    const result = await taskGroupModel.getList(filters, page, pageSize, sortOptions);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取任务组列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取任务组详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetail(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务组ID不能为空');
    }
    
    const result = await taskGroupModel.getDetail(id);
    
    if (!result) {
      return responseUtil.notFound(res, i18n.t('admin.taskGroup.notFound', req.lang));
    }
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取任务组详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 创建任务组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function create(req, res) {
  try {
    const { taskGroupName, taskGroupReward, relatedTasks } = req.body;
    
    // 验证必填字段
    if (!taskGroupName) {
      return responseUtil.badRequest(res, '任务组名称不能为空');
    }
    
    if (taskGroupReward === undefined || taskGroupReward === null) {
      return responseUtil.badRequest(res, '任务组奖励金额不能为空');
    }
    
    if (taskGroupReward < 0) {
      return responseUtil.badRequest(res, '任务组奖励金额不能为负数');
    }
    
    // 验证关联任务
    let validatedRelatedTasks = [];
    if (relatedTasks) {
      if (!Array.isArray(relatedTasks)) {
        return responseUtil.badRequest(res, '关联任务必须是数组格式');
      }
      
      // 验证任务ID是否为有效的正整数
      for (const taskId of relatedTasks) {
        const parsedId = parseInt(taskId, 10);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          return responseUtil.badRequest(res, '关联任务ID必须是正整数');
        }
        validatedRelatedTasks.push(parsedId);
      }
      
      // 去重
      validatedRelatedTasks = [...new Set(validatedRelatedTasks)];
    }
    
    // 创建任务组
    const result = await taskGroupModel.create({
      taskGroupName,
      taskGroupReward: parseFloat(taskGroupReward),
      relatedTasks: validatedRelatedTasks
    });
    
    return responseUtil.success(res, result, i18n.t('admin.taskGroup.createSuccess', req.lang), 201);
  } catch (error) {
    logger.error(`创建任务组失败: ${error.message}`);
    
    // 处理业务错误
    if (error.message.includes('任务组名称已存在')) {
      return responseUtil.badRequest(res, '任务组名称已存在');
    }
    if (error.message.includes('已属于其他任务组')) {
      return responseUtil.badRequest(res, error.message);
    }
    if (error.message.includes('不存在')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 更新任务组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { taskGroupName, taskGroupReward, relatedTasks } = req.body;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务组ID不能为空');
    }
    
    // 验证必填字段
    if (!taskGroupName) {
      return responseUtil.badRequest(res, '任务组名称不能为空');
    }
    
    if (taskGroupReward === undefined || taskGroupReward === null) {
      return responseUtil.badRequest(res, '任务组奖励金额不能为空');
    }
    
    if (taskGroupReward < 0) {
      return responseUtil.badRequest(res, '任务组奖励金额不能为负数');
    }
    
    // 验证关联任务
    let validatedRelatedTasks = [];
    if (relatedTasks) {
      if (!Array.isArray(relatedTasks)) {
        return responseUtil.badRequest(res, '关联任务必须是数组格式');
      }
      
      // 验证任务ID是否为有效的正整数
      for (const taskId of relatedTasks) {
        const parsedId = parseInt(taskId, 10);
        if (!Number.isInteger(parsedId) || parsedId <= 0) {
          return responseUtil.badRequest(res, '关联任务ID必须是正整数');
        }
        validatedRelatedTasks.push(parsedId);
      }
      
      // 去重
      validatedRelatedTasks = [...new Set(validatedRelatedTasks)];
    }
    
    // 更新任务组
    const result = await taskGroupModel.update(parseInt(id, 10), {
      taskGroupName,
      taskGroupReward: parseFloat(taskGroupReward),
      relatedTasks: validatedRelatedTasks
    });
    
    if (result) {
      return responseUtil.success(res, null, i18n.t('common.updateSuccess', req.lang));
    } else {
      return responseUtil.serverError(res);
    }
  } catch (error) {
    logger.error(`更新任务组失败: ${error.message}`);
    
    // 处理业务错误
    if (error.message.includes('任务组不存在')) {
      return responseUtil.notFound(res, '任务组不存在');
    }
    if (error.message.includes('任务组名称已存在')) {
      return responseUtil.badRequest(res, '任务组名称已存在');
    }
    if (error.message.includes('已属于其他任务组')) {
      return responseUtil.badRequest(res, error.message);
    }
    if (error.message.includes('不存在')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 删除任务组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '任务组ID不能为空');
    }
    
    const result = await taskGroupModel.remove(parseInt(id, 10));
    
    if (result) {
      return responseUtil.success(res, null, i18n.t('admin.taskGroup.deleteSuccess', req.lang));
    } else {
      return responseUtil.serverError(res);
    }
  } catch (error) {
    logger.error(`删除任务组失败: ${error.message}`);
    
    // 处理业务错误
    if (error.message.includes('任务组不存在')) {
      return responseUtil.notFound(res, '任务组不存在');
    }
    
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove
}; 