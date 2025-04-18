/**
 * 群组控制器
 * 处理H5端群组相关的业务逻辑
 */
const groupModel = require('../../shared/models/group.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取当前会员所属群列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getMemberGroups(req, res) {
  try {
    const memberId = req.user.id;
    const groups = await groupModel.getMemberGroups(memberId);
    
    return responseUtil.success(res, groups);
  } catch (error) {
    logger.error(`获取会员群组列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取群主名下群统计信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getOwnerGroupStats(req, res) {
  try {
    const memberId = req.user.id;
    const stats = await groupModel.getOwnerGroupStats(memberId);
    
    return responseUtil.success(res, stats);
  } catch (error) {
    logger.error(`获取群主统计信息失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取群成员列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getGroupMembers(req, res) {
  try {
    const { groupId } = req.params;
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE } = req.query;
    const memberId = req.user.id;
    
    // 验证该会员是否是该群的群主
    const groups = await groupModel.getMemberGroups(memberId);
    const group = groups.find(g => g.id === parseInt(groupId, 10) && g.isGroupOwner);
    
    if (!group) {
      return responseUtil.forbidden(res, i18n.t('h5.group.noPermission', req.lang));
    }
    
    const members = await groupModel.getGroupMembers(parseInt(groupId, 10), page, pageSize);
    
    return responseUtil.success(res, members);
  } catch (error) {
    if (error.message === '群组不存在') {
      return responseUtil.notFound(res, i18n.t('h5.group.notFound', req.lang));
    }
    logger.error(`获取群组成员列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取为群主带来收益的任务列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getOwnerCommissionTasks(req, res) {
  try {
    const memberId = req.user.id;
    const { page, pageSize, startDate, endDate } = req.query;
    
    // 构建查询选项
    const options = {
      page: parseInt(page) || DEFAULT_PAGE,
      pageSize: parseInt(pageSize) || DEFAULT_PAGE_SIZE
    };
    
    if (startDate) {
      options.startDate = startDate;
    }
    
    if (endDate) {
      options.endDate = endDate;
    }
    
    // 获取任务列表
    const result = await groupModel.getOwnerCommissionTasks(memberId, options);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取群主任务收益列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getMemberGroups,
  getOwnerGroupStats,
  getGroupMembers,
  getOwnerCommissionTasks
}; 