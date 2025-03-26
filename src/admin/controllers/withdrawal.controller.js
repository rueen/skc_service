/**
 * Admin端提现控制器
 * 处理提现相关的请求
 */
const withdrawalModel = require('../../shared/models/withdrawal.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');

/**
 * 获取提现记录列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getWithdrawals(req, res) {
  try {
    const { page, pageSize, withdrawalStatus, memberId, startTime, endTime } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10
    };
    
    if (withdrawalStatus) {
      options.withdrawalStatus = withdrawalStatus;
    }
    
    if (memberId) {
      options.memberId = memberId;
    }
    
    if (startTime) {
      options.startTime = startTime;
    }
    
    if (endTime) {
      options.endTime = endTime;
    }
    
    const withdrawals = await withdrawalModel.getAllWithdrawals(options);
    
    return responseUtil.success(res, withdrawals);
  } catch (error) {
    logger.error(`获取提现记录列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取提现记录列表失败');
  }
}

/**
 * 批量审核通过提现申请
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchResolveWithdrawals(req, res) {
  try {
    const { ids, remark } = req.body;
    const waiterId = req.user.id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '提现ID列表不能为空');
    }
    
    const result = await withdrawalModel.batchApproveWithdrawals(ids, waiterId, remark);
    
    if (!result) {
      return responseUtil.badRequest(res, '批量审核失败，可能没有符合条件的提现申请');
    }
    
    return responseUtil.success(res, { message: '批量审核通过成功' });
  } catch (error) {
    logger.error(`批量审核通过提现申请失败: ${error.message}`);
    return responseUtil.serverError(res, '批量审核通过提现申请失败');
  }
}

/**
 * 批量拒绝提现申请
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchRejectWithdrawals(req, res) {
  try {
    const { ids, rejectReason, remark } = req.body;
    const waiterId = req.user.id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '提现ID列表不能为空');
    }
    
    if (!rejectReason) {
      return responseUtil.badRequest(res, '拒绝原因不能为空');
    }
    
    const result = await withdrawalModel.batchRejectWithdrawals(ids, rejectReason, waiterId, remark);
    
    if (!result) {
      return responseUtil.badRequest(res, '批量拒绝失败，可能没有符合条件的提现申请');
    }
    
    return responseUtil.success(res, { message: '批量拒绝提现申请成功' });
  } catch (error) {
    logger.error(`批量拒绝提现申请失败: ${error.message}`);
    return responseUtil.serverError(res, '批量拒绝提现申请失败');
  }
}

module.exports = {
  getWithdrawals,
  batchResolveWithdrawals,
  batchRejectWithdrawals
}; 