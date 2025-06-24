/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 21:36:12
 * @Description: 
 */
/**
 * H5端文章控制器
 * 处理H5端文章相关的业务逻辑
 */
const articleModel = require('../../shared/models/article.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取文章详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetailById(req, res) {
  try {
    const { id } = req.params;
    
    // 获取文章详情
    const article = await articleModel.getById(parseInt(id, 10));
    
    if (!article) {
      return responseUtil.notFound(res, i18n.t('h5.article.notFound', req.lang));
    }
    
    // 已移除阅读量统计功能
    
    return responseUtil.success(res, article);
  } catch (error) {
    logger.error(`获取文章详情失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('h5.article.notFound', req.lang));
    }
    
    return responseUtil.success(res, article);
  } catch (error) {
    logger.error(`通过位置标识获取文章详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getDetailById,
  getDetailByLocation
}; 