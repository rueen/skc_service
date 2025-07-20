/**
 * 位置路由
 * 处理位置相关的路由配置
 */
const express = require('express');
const { query } = require('express-validator');
const locationModel = require('../models/location.model');
const { logger } = require('../config/logger.config');
const responseUtil = require('../utils/response.util');
const validatorUtil = require('../utils/validator.util');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// 应用速率限制
router.use(rateLimiterMiddleware.apiLimiter);

/**
 * 获取位置列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { type } = req.query;
    
    logger.info(`获取位置列表 - 类型: ${type || '全部'}`);
    
    // 构建筛选条件
    const filters = {};
    if (type) filters.type = type;
    
    // 获取位置列表
    const locationList = await locationModel.getList(filters);
    
    logger.info(`位置列表返回 - 数量: ${locationList.length}`);
    
    return responseUtil.success(res, locationList);
  } catch (error) {
    logger.error(`获取位置列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * @route GET /api/location
 * @desc 获取位置列表
 * @access Public
 */
router.get(
  '/',
  [
    query('type')
      .optional()
      .isString()
      .withMessage('类型必须是字符串')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  getList
);

module.exports = router; 