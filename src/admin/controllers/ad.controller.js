/**
 * 管理端广告控制器
 * 处理广告相关的业务逻辑
 */
const adModel = require('../../shared/models/ad.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');

/**
 * 获取广告列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      title, 
      status, 
      location,
      sorterField, 
      sorterOrder 
    } = req.query;
    
    logger.info(`获取广告列表 - 页码: ${page}, 页大小: ${pageSize}, 标题: ${title || '无'}, 状态: ${status || '无'}`);
    
    // 构建筛选条件
    const filters = {};
    if (title) filters.title = title;
    if (status) filters.status = status;
    if (location) filters.location = location;
    
    // 构建排序选项
    const sortOptions = {};
    if (sorterField && sorterOrder) {
      sortOptions.field = sorterField;
      sortOptions.order = sorterOrder;
    }
    
    // 获取广告列表
    const result = await adModel.getList(filters, page, pageSize, sortOptions);
    
    logger.info(`广告列表返回 - 总数: ${result.total}, 当前页数据量: ${result.list.length}`);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取广告列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取广告详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetail(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '广告ID不能为空');
    }
    
    logger.info(`获取广告详情 - 广告ID: ${id}`);
    
    const ad = await adModel.getDetail(parseInt(id, 10));
    
    if (!ad) {
      return responseUtil.notFound(res, '广告不存在');
    }
    
    return responseUtil.success(res, ad);
  } catch (error) {
    logger.error(`获取广告详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 创建广告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function create(req, res) {
  try {
    const { title, location, startTime, endTime, content } = req.body;
    
    // 基本参数验证
    if (!title) {
      return responseUtil.badRequest(res, '广告标题不能为空');
    }
    
    if (!location) {
      return responseUtil.badRequest(res, '广告位置不能为空');
    }
    
    if (!startTime) {
      return responseUtil.badRequest(res, '开始时间不能为空');
    }
    
    if (!endTime) {
      return responseUtil.badRequest(res, '结束时间不能为空');
    }
    
    // 时间验证
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return responseUtil.badRequest(res, '时间格式不正确');
    }
    
    if (start >= end) {
      return responseUtil.badRequest(res, '开始时间必须早于结束时间');
    }
    
    logger.info(`创建广告 - 标题: ${title}, 位置: ${location}`);
    
    // 创建广告
    const result = await adModel.create({
      title,
      location,
      startTime,
      endTime,
      content
    });
    
    logger.info(`广告创建成功 - ID: ${result.id}`);
    
    return responseUtil.success(res, result, '广告创建成功');
  } catch (error) {
    logger.error(`创建广告失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '所选位置不存在') {
      return responseUtil.badRequest(res, '所选位置不存在');
    }
    if (error.message === '开始时间必须早于结束时间') {
      return responseUtil.badRequest(res, '开始时间必须早于结束时间');
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 更新广告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { title, location, startTime, endTime, content } = req.body;
    
    if (!id) {
      return responseUtil.badRequest(res, '广告ID不能为空');
    }
    
    // 时间验证（如果提供了时间）
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return responseUtil.badRequest(res, '时间格式不正确');
      }
      
      if (start >= end) {
        return responseUtil.badRequest(res, '开始时间必须早于结束时间');
      }
    }
    
    logger.info(`更新广告 - 广告ID: ${id}`);
    
    // 更新广告
    const result = await adModel.update({
      id: parseInt(id, 10),
      title,
      location,
      startTime,
      endTime,
      content
    });
    
    if (!result) {
      return responseUtil.notFound(res, '广告不存在');
    }
    
    logger.info(`广告更新成功 - ID: ${id}`);
    
    return responseUtil.success(res, null, '广告更新成功');
  } catch (error) {
    logger.error(`更新广告失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '广告不存在') {
      return responseUtil.notFound(res, '广告不存在');
    }
    if (error.message === '所选位置不存在') {
      return responseUtil.badRequest(res, '所选位置不存在');
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 删除广告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '广告ID不能为空');
    }
    
    logger.info(`删除广告 - 广告ID: ${id}`);
    
    const result = await adModel.remove(parseInt(id, 10));
    
    if (!result) {
      return responseUtil.notFound(res, '广告不存在');
    }
    
    logger.info(`广告删除成功 - ID: ${id}`);
    
    return responseUtil.success(res, null, '广告删除成功');
  } catch (error) {
    logger.error(`删除广告失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '广告不存在') {
      return responseUtil.notFound(res, '广告不存在');
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