/**
 * 通知控制器
 * 处理H5端通知相关业务逻辑
 */
const notificationModel = require('../../shared/models/notification.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取用户未读通知
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
const getUnreadNotifications = async (req, res) => {
  try {
    const { id: memberId } = req.user;
    
    // 获取用户所有未读通知
    const notifications = await notificationModel.getUnreadByMemberId(memberId);
    
    return responseUtil.success(res, notifications, '获取未读通知成功');
  } catch (error) {
    logger.error(`获取未读通知失败: ${error.message}`);
    return responseUtil.serverError(res, '获取未读通知失败');
  }
};

/**
 * 标记通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id: notificationId } = req.params;
    const { id: memberId } = req.user;
    
    // 标记通知为已读
    const result = await notificationModel.markAsRead(notificationId, memberId);
    
    if (!result) {
      return responseUtil.notFound(res, '通知不存在或无权操作');
    }
    
    return responseUtil.success(res, { success: true }, '标记通知为已读成功');
  } catch (error) {
    logger.error(`标记通知为已读失败: ${error.message}`);
    return responseUtil.serverError(res, '标记通知为已读失败');
  }
};

/**
 * 批量标记通知为已读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Promise<void>}
 */
const batchMarkNotificationsAsRead = async (req, res) => {
  try {
    const { ids } = req.body;
    const { id: memberId } = req.user;
    
    // 验证参数
    if (!Array.isArray(ids)) {
      return responseUtil.badRequest(res, 'ids参数必须是数组格式');
    }
    
    // 批量标记通知为已读
    const affectedCount = await notificationModel.batchMarkAsRead(ids, memberId);
    
    return responseUtil.success(
      res, 
      { success: true, affectedCount }, 
      `成功标记${affectedCount}条通知为已读`
    );
  } catch (error) {
    logger.error(`批量标记通知为已读失败: ${error.message}`);
    return responseUtil.serverError(res, '批量标记通知为已读失败');
  }
};

module.exports = {
  getUnreadNotifications,
  markNotificationAsRead,
  batchMarkNotificationsAsRead
}; 