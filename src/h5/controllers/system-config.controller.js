/*
 * @Author: diaochan
 * @Date: 2025-04-02 10:42:57
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-02 10:48:34
 * @Description: 
 */
/**
 * 系统配置控制器
 * 处理H5端系统配置相关的业务逻辑
 */
const systemConfigModel = require('../../shared/models/system.config.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取所有系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAllConfigs(req, res) {
  try {
    const configs = await systemConfigModel.getAllConfigs();
    
    return responseUtil.success(res, configs, '获取所有系统配置成功');
  } catch (error) {
    logger.error(`H5端获取所有系统配置失败: ${error.message}`);
    return responseUtil.serverError(res, '获取所有系统配置失败，请稍后重试');
  }
}

module.exports = {
  getAllConfigs
}; 