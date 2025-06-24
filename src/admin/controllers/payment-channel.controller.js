/**
 * 支付渠道控制器
 * 处理支付渠道相关的业务逻辑
 */
const paymentChannelModel = require('../../shared/models/payment-channel.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取支付渠道列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getPaymentChannels(req, res) {
  try {
    // 获取支付渠道列表
    const channels = await paymentChannelModel.getList();
    
    return responseUtil.success(res, channels);
  } catch (error) {
    logger.error(`获取支付渠道列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取支付渠道列表失败');
  }
}

/**
 * 添加支付渠道
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function addPaymentChannel(req, res) {
  try {
    const { name, bank, merchantId, secretKey } = req.body;
    
    // 添加支付渠道
    const channelData = {
      name,
      bank,
      merchantId,
      secretKey
    };
    
    const newChannel = await paymentChannelModel.create(channelData);
    
    return responseUtil.success(res, newChannel, '添加支付渠道成功');
  } catch (error) {
    logger.error(`添加支付渠道失败: ${error.message}`);
    return responseUtil.serverError(res, '添加支付渠道失败');
  }
}

/**
 * 更新支付渠道
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updatePaymentChannel(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, bank, merchantId, secretKey } = req.body;
    
    if (isNaN(id)) {
      return responseUtil.badRequest(res, '无效的ID');
    }
    
    // 检查支付渠道是否存在
    const existingChannel = await paymentChannelModel.getById(id);
    if (!existingChannel) {
      return responseUtil.notFound(res, '支付渠道不存在');
    }
    
    // 更新支付渠道
    const channelData = {
      id,
      name,
      bank,
      merchantId
    };
    
    // 如果提供了secretKey，则更新secretKey
    if (secretKey) {
      channelData.secretKey = secretKey;
    }
    
    const result = await paymentChannelModel.update(channelData);
    
    if (!result) {
      return responseUtil.serverError(res, '更新支付渠道失败');
    }
    
    return responseUtil.success(res, { success: true }, '更新支付渠道成功');
  } catch (error) {
    logger.error(`更新支付渠道失败: ${error.message}`);
    
    if (error.message.includes('支付渠道不存在')) {
      return responseUtil.notFound(res, error.message);
    }
    
    return responseUtil.serverError(res, '更新支付渠道失败');
  }
}

/**
 * 删除支付渠道
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deletePaymentChannel(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return responseUtil.badRequest(res, '无效的ID');
    }
    
    // 删除支付渠道
    const result = await paymentChannelModel.remove(id);
    
    if (!result) {
      return responseUtil.notFound(res, '支付渠道不存在');
    }
    
    return responseUtil.success(res, { success: true }, '删除支付渠道成功');
  } catch (error) {
    logger.error(`删除支付渠道失败: ${error.message}`);
    
    if (error.message.includes('支付渠道不存在')) {
      return responseUtil.notFound(res, error.message);
    }
    
    return responseUtil.serverError(res, '删除支付渠道失败');
  }
}

module.exports = {
  getPaymentChannels,
  addPaymentChannel,
  updatePaymentChannel,
  deletePaymentChannel
}; 