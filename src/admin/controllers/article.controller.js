/**
 * 文章控制器
 * 处理文章相关的请求
 */
const articleModel = require('../../shared/models/article.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取文章列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function list(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, keyword } = req.query;
    
    // 获取文章列表
    const result = await articleModel.getList(
      { keyword },
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取文章列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 创建文章
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function add(req, res) {
  try {
    const { title, content, location } = req.body;
    
    if (!title || !content) {
      return responseUtil.badRequest(res, '标题和内容不能为空');
    }
    
    // 创建文章
    const result = await articleModel.create({
      title,
      content,
      location
    });
    
    return responseUtil.success(res, result);
  } catch (error) {
    if (error.message === '文章位置标识已存在') {
      return responseUtil.badRequest(res, i18n.t('admin.article.locationExists', req.lang));
    }
    logger.error(`创建文章失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 更新文章
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function edit(req, res) {
  try {
    const { id } = req.params;
    const { title, content, location } = req.body;
    
    if (!title || !content) {
      return responseUtil.badRequest(res, '标题和内容不能为空');
    }
    
    // 更新文章
    const success = await articleModel.update({
      id,
      title,
      content,
      location
    });
    
    if (!success) {
      return responseUtil.notFound(res, i18n.t('admin.article.notFound', req.lang));
    }
    
    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === '文章位置标识已存在') {
      return responseUtil.badRequest(res, i18n.t('admin.article.locationExists', req.lang));
    }
    logger.error(`更新文章失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 删除文章
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function remove(req, res) {
  try {
    const { id, location } = req.body;
    
    if (!id && !location) {
      return responseUtil.badRequest(res, '文章标识(id或location)不能为空');
    }
    
    // 删除文章
    const success = await articleModel.remove({ id, location });
    
    if (!success) {
      return responseUtil.notFound(res, i18n.t('admin.article.notFound', req.lang));
    }
    
    return responseUtil.success(res, null);
  } catch (error) {
    logger.error(`删除文章失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  list,
  add,
  edit,
  remove
}; 