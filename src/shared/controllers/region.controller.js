/**
 * 地区控制器
 * 提供获取默认地区的接口
 */
const responseUtil = require('../utils/response.util');

/**
 * 获取默认地区
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
function getDefaultRegion(req, res) {
  try {
    // 从环境变量中获取默认地区，如果没有则使用默认值 'Malaysia'
    const defaultRegion = process.env.DEFAULT_REGION || 'Malaysia';
    
    // 返回默认地区信息
    return responseUtil.success(res, {
      region: defaultRegion
    });
  } catch (error) {
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getDefaultRegion
};
