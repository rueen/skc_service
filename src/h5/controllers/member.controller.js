/**
 * H5端会员控制器
 * 处理H5端会员相关的业务逻辑
 */
const memberModel = require('../../shared/models/member.model');
const memberBalanceModel = require('../../shared/models/member-balance.model');
const billModel = require('../../shared/models/bill.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');

/**
 * 更新会员个人资料
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateProfile(req, res) {
  try {
    const memberId = req.user.id;
    const { memberNickname, occupation, phone, email, avatar, gender, telegram } = req.body;
    
    // 获取会员信息
    const member = await memberModel.getById(memberId);
    
    if (!member) {
      return responseUtil.notFound(res, '会员不存在');
    }
    
    // 验证性别值是否有效
    if (gender !== undefined && ![0, 1, 2].includes(Number(gender))) {
      return responseUtil.badRequest(res, '无效的性别值，应为 0(男)、1(女) 或 2(保密)');
    }
    
    // 更新会员信息
    const updateData = {
      id: memberId
    };
    
    if (memberNickname) updateData.memberNickname = memberNickname;
    if (occupation) updateData.occupation = occupation;
    
    // 支持单独编辑 phone 和 email 字段
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    
    // 支持新增字段
    if (avatar !== undefined) updateData.avatar = avatar;
    if (gender !== undefined) updateData.gender = Number(gender);
    if (telegram !== undefined) updateData.telegram = telegram;
    
    const success = await memberModel.update(updateData);
    
    if (!success) {
      return responseUtil.serverError(res, '更新个人资料失败');
    }
    
    // 获取更新后的会员信息
    const updatedMember = await memberModel.getById(memberId);
    
    // 移除敏感信息
    delete updatedMember.password;
    
    return responseUtil.success(res, updatedMember, '更新个人资料成功');
  } catch (error) {
    logger.error(`更新会员个人资料失败: ${error.message}`);
    return responseUtil.serverError(res, '更新会员个人资料失败');
  }
}

/**
 * 获取会员账户余额
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getBalance(req, res) {
  try {
    const memberId = req.user.id;
    
    // 获取会员余额
    const balance = await memberBalanceModel.getBalance(memberId);
    const withdrawalAmount = await memberBalanceModel.getWithdrawalAmount(memberId);
    
    // 返回余额信息
    return responseUtil.success(res, {
      balance,
      withdrawalAmount
    });
  } catch (error) {
    logger.error(`获取会员账户余额失败: ${error.message}`);
    return responseUtil.serverError(res, '获取会员账户余额失败');
  }
}

/**
 * 获取会员账单列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getBills(req, res) {
  try {
    const memberId = req.user.id;
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, billType, settlementStatus } = req.query;
    
    // 获取会员账单列表
    const result = await billModel.getMemberBills(memberId, {
      page,
      pageSize,
      billType,
      settlementStatus
    });
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取会员账单列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取会员账单列表失败');
  }
}

module.exports = {
  updateProfile,
  getBalance,
  getBills
}; 