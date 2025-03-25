/**
 * H5端邀请控制器
 * 处理H5端邀请相关的业务逻辑
 */
const inviteModel = require('../../shared/models/invite.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');

/**
 * 获取会员邀请数据统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getInviteStats(req, res) {
  try {
    const memberId = req.user.id;
    
    // 获取邀请统计数据
    const stats = await inviteModel.getInviteStats(memberId);
    
    return responseUtil.success(res, stats);
  } catch (error) {
    logger.error(`获取会员邀请数据统计失败: ${error.message}`);
    return responseUtil.serverError(res, '获取会员邀请数据统计失败');
  }
}

/**
 * 获取会员邀请好友列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getInviteFriends(req, res) {
  try {
    const memberId = req.user.id;
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE } = req.query;
    
    // 获取邀请好友列表
    const result = await inviteModel.getInviteFriends(memberId, {
      page,
      pageSize
    });
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取会员邀请好友列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取会员邀请好友列表失败');
  }
}

module.exports = {
  getInviteStats,
  getInviteFriends
}; 