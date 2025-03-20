/**
 * 系统配置控制器
 * 处理系统配置相关的业务逻辑
 */
const systemConfigModel = require('../../shared/models/system.config.model');
const { SUCCESS, BAD_REQUEST, NOT_FOUND, SERVER_ERROR } = require('../../shared/config/api.config').STATUS_CODES;
const { MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');

/**
 * 获取所有系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAllConfigs(req, res) {
  try {
    const configs = await systemConfigModel.getAllConfigs();
    
    return res.json({
      code: SUCCESS,
      message: MESSAGES.SUCCESS,
      data: configs
    });
  } catch (error) {
    logger.error(`获取所有系统配置失败: ${error.message}`);
    return res.status(500).json({
      code: SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
  }
}

/**
 * 获取指定键的系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getConfigByKey(req, res) {
  try {
    const { key } = req.params;
    
    const config = await systemConfigModel.getConfigByKey(key);
    
    if (!config) {
      return res.status(404).json({
        code: NOT_FOUND,
        message: `配置键 "${key}" 不存在`
      });
    }
    
    return res.json({
      code: SUCCESS,
      message: MESSAGES.SUCCESS,
      data: config
    });
  } catch (error) {
    logger.error(`获取指定键的系统配置失败: ${error.message}`);
    return res.status(500).json({
      code: SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
  }
}

/**
 * 更新指定键的系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateConfig(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    const success = await systemConfigModel.updateConfig(key, value, description);
    
    if (!success) {
      return res.status(404).json({
        code: NOT_FOUND,
        message: `配置键 "${key}" 不存在或更新失败`
      });
    }
    
    // 获取更新后的配置
    const updatedConfig = await systemConfigModel.getConfigByKey(key);
    
    return res.json({
      code: SUCCESS,
      message: '配置更新成功',
      data: updatedConfig
    });
  } catch (error) {
    logger.error(`更新系统配置失败: ${error.message}`);
    return res.status(400).json({
      code: BAD_REQUEST,
      message: error.message || '更新系统配置失败'
    });
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
      return res.status(400).json({
        code: BAD_REQUEST,
        message: '配置数据无效或为空'
      });
    }
    
    await systemConfigModel.updateConfigs(configs);
    
    // 获取更新后的所有配置
    const updatedConfigs = await systemConfigModel.getAllConfigs();
    
    return res.status(200).json({
      code: SUCCESS,
      message: '系统配置批量更新成功',
      data: {
        updatedKeys: Object.keys(configs),
        configs: updatedConfigs
      }
    });
  } catch (error) {
    logger.error(`批量更新系统配置失败: ${error.message}`);
    return res.status(400).json({
      code: BAD_REQUEST,
      message: error.message || '批量更新系统配置失败'
    });
  }
}

/**
 * 获取群组最大成员数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getMaxGroupMembers(req, res) {
  try {
    const maxMembers = await systemConfigModel.getMaxGroupMembers();
    
    return res.json({
      code: SUCCESS,
      message: MESSAGES.SUCCESS,
      data: { maxMembers }
    });
  } catch (error) {
    logger.error(`获取群组最大成员数失败: ${error.message}`);
    return res.status(500).json({
      code: SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
  }
}

/**
 * 获取群主收益率
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getGroupOwnerCommissionRate(req, res) {
  try {
    const rate = await systemConfigModel.getGroupOwnerCommissionRate();
    
    return res.json({
      code: SUCCESS,
      message: MESSAGES.SUCCESS,
      data: { rate }
    });
  } catch (error) {
    logger.error(`获取群主收益率失败: ${error.message}`);
    return res.status(500).json({
      code: SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
  }
}

/**
 * 获取邀请奖励金额
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getInviteRewardAmount(req, res) {
  try {
    const amount = await systemConfigModel.getInviteRewardAmount();
    
    return res.json({
      code: SUCCESS,
      message: MESSAGES.SUCCESS,
      data: { amount }
    });
  } catch (error) {
    logger.error(`获取邀请奖励金额失败: ${error.message}`);
    return res.status(500).json({
      code: SERVER_ERROR,
      message: error.message || MESSAGES.SERVER_ERROR
    });
  }
}

module.exports = {
  getAllConfigs,
  getConfigByKey,
  updateConfig,
  updateConfigs,
  getMaxGroupMembers,
  getGroupOwnerCommissionRate,
  getInviteRewardAmount
}; 