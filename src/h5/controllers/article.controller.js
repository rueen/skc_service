/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-20 21:55:31
 * @Description: 
 */
/**
 * H5端文章控制器
 * 处理H5端文章相关的业务逻辑
 */
const articleModel = require('../../shared/models/article.model');
const { STATUS_CODES, MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取文章列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { page = 1, pageSize = 10, category } = req.query;
    
    // 构建筛选条件
    const filters = {};
    
    if (category) filters.category = category;
    
    // 获取文章列表
    const result = await articleModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取文章列表失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 获取文章详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetail(req, res) {
  try {
    const { id } = req.params;
    
    // 获取文章详情
    const article = await articleModel.getById(parseInt(id, 10));
    
    if (!article) {
      return responseUtil.notFound(res, '文章不存在');
    }
    
    // 已移除阅读量统计功能
    
    return responseUtil.success(res, article);
  } catch (error) {
    logger.error(`获取文章详情失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 通过位置标识获取文章详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetailByLocation(req, res) {
  try {
    const { location } = req.params;
    
    // 获取文章详情
    const article = await articleModel.getByLocation(location);
    
    if (!article) {
      return responseUtil.notFound(res, '文章不存在');
    }
    
    return responseUtil.success(res, article);
  } catch (error) {
    logger.error(`通过位置标识获取文章详情失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

module.exports = {
  getList,
  getDetail,
  getDetailByLocation
}; 