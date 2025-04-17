/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 20:30:24
 * @Description: 
 */
/**
 * H5端渠道控制器
 * 处理H5端渠道相关的业务逻辑
 */
const channelModel = require('../../shared/models/channel.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取渠道列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    // 获取所有渠道
    const result = await channelModel.getList();
    
    return responseUtil.success(res, result.list);
  } catch (error) {
    logger.error(`获取渠道列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getList
}; 