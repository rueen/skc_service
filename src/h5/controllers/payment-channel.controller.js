/**
 * H5端支付渠道控制器
 * 处理H5端支付渠道相关的业务逻辑
 */
const paymentChannelModel = require('../../shared/models/payment-channel.model');
const logger = require('../../shared/config/logger.config');
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

module.exports = {
  getPaymentChannels
}; 