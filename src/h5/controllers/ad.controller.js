/**
 * H5端广告控制器
 * 处理H5端广告相关的业务逻辑
 */
const adModel = require('../../shared/models/ad.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取H5端广告列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getList(req, res) {
  try {
    const { location } = req.query;
    
    if (!location) {
      return responseUtil.badRequest(res, '广告位置不能为空');
    }

    // 提取会员ID用于群组筛选
    const memberId = req.user ? req.user.id : null;
    
    logger.info(`获取H5端广告列表 - 位置: ${location}, 是否有用户: ${req.user ? '是' : '否'}, 会员ID: ${memberId || '未登录'}`);
    
    // 获取有效期内的广告列表，进行群组筛选
    const adList = await adModel.getH5List(location, memberId);
    
    logger.info(`H5端广告列表返回 - 位置: ${location}, 广告数量: ${adList.length}`);
    
    return responseUtil.success(res, adList);
  } catch (error) {
    logger.error(`获取H5端广告列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getList
}; 