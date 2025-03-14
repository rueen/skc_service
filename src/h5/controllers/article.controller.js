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
    const filters = {
      isPublished: true // 只显示已发布的文章
    };
    
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
    
    // 检查文章是否已发布
    if (!article.isPublished) {
      return responseUtil.forbidden(res, '该文章尚未发布');
    }
    
    // 增加文章阅读量
    await articleModel.incrementViewCount(parseInt(id, 10));
    
    return responseUtil.success(res, article);
  } catch (error) {
    logger.error(`获取文章详情失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

module.exports = {
  getList,
  getDetail
}; 