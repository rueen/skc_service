/**
 * 系统配置控制器
 * 处理系统配置相关的业务逻辑
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
    logger.error(`获取所有系统配置失败: ${error.message}`);
    return responseUtil.serverError(res, '获取所有系统配置失败，请稍后重试');
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
    
    if (!key) {
      return responseUtil.badRequest(res, '配置键不能为空');
    }
    
    const config = await systemConfigModel.getConfigByKey(key);
    
    if (!config) {
      return responseUtil.notFound(res, '未找到指定的系统配置');
    }
    
    return responseUtil.success(res, config, '获取系统配置成功');
  } catch (error) {
    logger.error(`获取系统配置失败: ${error.message}`);
    return responseUtil.serverError(res, '获取系统配置失败，请稍后重试');
  }
}

/**
 * 更新系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateConfig(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (!key) {
      return responseUtil.badRequest(res, '配置键不能为空');
    }
    
    if (value === undefined) {
      return responseUtil.badRequest(res, '配置值不能为空');
    }
    
    // 检查配置是否存在
    const existingConfig = await systemConfigModel.getConfigByKey(key);
    
    if (!existingConfig) {
      return responseUtil.notFound(res, '未找到指定的系统配置');
    }
    
    // 更新配置
    const result = await systemConfigModel.updateConfig(key, value, description);
    
    return responseUtil.success(res, { success: result }, '更新系统配置成功');
  } catch (error) {
    logger.error(`更新系统配置失败: ${error.message}`);
    return responseUtil.serverError(res, '更新系统配置失败，请稍后重试');
  }
}

/**
 * 批量更新系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateConfigs(req, res) {
  try {
    const configs = req.body;
    
    if (!Array.isArray(configs) || configs.length === 0) {
      return responseUtil.badRequest(res, '配置数组不能为空');
    }
    
    // 验证每个配置项
    for (const config of configs) {
      if (!config.key || config.value === undefined) {
        return responseUtil.badRequest(res, '每个配置项必须包含key和value字段');
      }
    }
    
    // 批量更新配置
    const results = await systemConfigModel.updateConfigs(configs);
    
    return responseUtil.success(res, results, '批量更新系统配置成功');
  } catch (error) {
    logger.error(`批量更新系统配置失败: ${error.message}`);
    return responseUtil.serverError(res, '批量更新系统配置失败，请稍后重试');
  }
}

/**
 * 获取群组最大成员数配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getMaxGroupMembers(req, res) {
  try {
    const config = await systemConfigModel.getConfigByKey('MAX_GROUP_MEMBERS');
    
    if (!config) {
      return responseUtil.notFound(res, '未找到群组最大成员数配置');
    }
    
    return responseUtil.success(res, {
      maxGroupMembers: parseInt(config.value, 10)
    }, '获取群组最大成员数成功');
  } catch (error) {
    logger.error(`获取群组最大成员数失败: ${error.message}`);
    return responseUtil.serverError(res, '获取群组最大成员数失败，请稍后重试');
  }
}

/**
 * 获取群主佣金比例配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getGroupOwnerCommissionRate(req, res) {
  try {
    const config = await systemConfigModel.getConfigByKey('GROUP_OWNER_COMMISSION_RATE');
    
    if (!config) {
      return responseUtil.notFound(res, '未找到群主佣金比例配置');
    }
    
    return responseUtil.success(res, {
      commissionRate: parseFloat(config.value)
    }, '获取群主佣金比例成功');
  } catch (error) {
    logger.error(`获取群主佣金比例失败: ${error.message}`);
    return responseUtil.serverError(res, '获取群主佣金比例失败，请稍后重试');
  }
}

/**
 * 获取邀请奖励金额配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getInviteRewardAmount(req, res) {
  try {
    const config = await systemConfigModel.getConfigByKey('INVITE_REWARD_AMOUNT');
    
    if (!config) {
      return responseUtil.notFound(res, '未找到邀请奖励金额配置');
    }
    
    return responseUtil.success(res, {
      rewardAmount: parseFloat(config.value)
    }, '获取邀请奖励金额成功');
  } catch (error) {
    logger.error(`获取邀请奖励金额失败: ${error.message}`);
    return responseUtil.serverError(res, '获取邀请奖励金额失败，请稍后重试');
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