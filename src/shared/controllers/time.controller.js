/**
 * 时间控制器
 * 提供获取服务器时间的接口
 */
const responseUtil = require('../utils/response.util');

/**
 * 获取服务器当前时间戳
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
function getServerTime(req, res) {
  try {
    // 获取当前时间戳(秒)
    const timestamp = Math.floor(Date.now() / 1000);
    
    // 添加时区信息便于调试
    const date = new Date();
    const timezoneOffset = date.getTimezoneOffset();
    const timezone = `UTC${timezoneOffset <= 0 ? '+' : '-'}${Math.abs(Math.floor(timezoneOffset / 60))}`;
    
    // 返回服务器时间信息
    return responseUtil.success(res, {
      timestamp,
      timezone,
      isoString: date.toISOString(),
      serverTime: date.toString()
    });
  } catch (error) {
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getServerTime
}; 