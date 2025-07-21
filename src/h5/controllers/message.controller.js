/**
 * H5端站内信控制器
 * 处理H5端站内信相关的请求
 */
const messageModel = require('../../shared/models/message.model');
const responseUtil = require('../../shared/utils/response.util');
const validatorUtil = require('../../shared/utils/validator.util');
const { logger } = require('../../shared/config/logger.config');

/**
 * 获取有效期内的站内信列表
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function getList(req, res) {
  try {
    // 获取有效期内的站内信列表
    const messages = await messageModel.getValidMessages();
    
    return responseUtil.success(res, messages);
  } catch (error) {
    logger.error(`获取站内信列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 标记站内信为已读
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function markAsRead(req, res) {
  try {
    const { messageId } = req.body;
    const memberId = req.user.id; // 从认证中间件获取用户ID
    
    // 验证messageId
    if (!validatorUtil.isValidId(messageId)) {
      return responseUtil.badRequest(res, '无效的站内信ID');
    }
    
    // 检查站内信是否存在
    const message = await messageModel.getById(parseInt(messageId, 10));
    if (!message) {
      return responseUtil.notFound(res, '站内信不存在');
    }
    
    // 标记为已读
    await messageModel.markAsRead(parseInt(messageId, 10), memberId);
    
    return responseUtil.success(res, null, '标记已读成功');
  } catch (error) {
    logger.error(`标记站内信已读失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getList,
  markAsRead
}; 