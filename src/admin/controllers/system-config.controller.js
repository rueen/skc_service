/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-30 21:43:31
 * @Description: 
 */
/**
 * 系统配置控制器
 * 处理系统配置相关的业务逻辑
 */
const systemConfigModel = require('../../shared/models/system.config.model');
const { logger } = require('../../shared/config/logger.config');
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
    logger.error(`获取所有系统配置失败: ${error.message}`);
    return responseUtil.serverError(res, '获取所有系统配置失败，请稍后重试');
  }
}

/**
 * 批量更新系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateConfigs(req, res) {
  try {
    const { configs } = req.body;
    
    if (!configs || typeof configs !== 'object' || Object.keys(configs).length === 0) {
      return responseUtil.badRequest(res, '配置数据无效或为空');
    }
    
    await systemConfigModel.updateConfigs(configs);
    
    return responseUtil.success(res, null, '批量更新系统配置成功');
  } catch (error) {
    logger.error(`批量更新系统配置失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || '批量更新系统配置失败');
  }
}

module.exports = {
  getAllConfigs,
  updateConfigs
}; 