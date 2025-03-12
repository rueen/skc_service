/**
 * 文章控制器
 * 处理文章相关的请求
 */
const articleModel = require('../models/article.model');
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

/**
 * 获取文章
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function get(req, res) {
  try {
    const { location } = req.query;
    
    if (!location) {
      return responseUtil.badRequest(res, '文章位置标识不能为空');
    }
    
    // 获取文章
    const article = await articleModel.getByLocation(location);
    if (!article) {
      return responseUtil.notFound(res, '文章不存在');
    }
    
    return responseUtil.success(res, article);
  } catch (error) {
    logger.error(`获取文章失败: ${error.message}`);
    return responseUtil.serverError(res, '获取文章失败');
  }
}

/**
 * 更新文章
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function edit(req, res) {
  try {
    const { title, content, location } = req.body;
    
    if (!title || !content || !location) {
      return responseUtil.badRequest(res, '标题、内容和位置标识不能为空');
    }
    
    // 更新文章
    const success = await articleModel.updateOrCreate({
      title,
      content,
      location
    });
    
    if (!success) {
      return responseUtil.serverError(res, '更新文章失败');
    }
    
    return responseUtil.success(res, {}, '更新文章成功');
  } catch (error) {
    logger.error(`更新文章失败: ${error.message}`);
    return responseUtil.serverError(res, '更新文章失败');
  }
}

module.exports = {
  get,
  edit
}; 