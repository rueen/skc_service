/**
 * H5端会员控制器
 * 处理H5端会员相关的业务逻辑
 */
const memberModel = require('../../shared/models/member.model');
const accountModel = require('../../shared/models/account.model');
const { STATUS_CODES, MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取会员个人资料
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getProfile(req, res) {
  try {
    const memberId = req.user.id;
    
    // 获取会员信息
    const member = await memberModel.getById(memberId);
    
    if (!member) {
      return responseUtil.notFound(res, '会员不存在');
    }
    
    // 移除敏感信息
    delete member.password;
    
    return responseUtil.success(res, member);
  } catch (error) {
    logger.error(`获取会员个人资料失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

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
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 获取会员账号列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAccounts(req, res) {
  try {
    const memberId = req.user.id;
    
    // 获取会员账号列表
    const accounts = await accountModel.getByMemberId(memberId);
    
    return responseUtil.success(res, accounts);
  } catch (error) {
    logger.error(`获取会员账号列表失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

/**
 * 添加会员账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function addAccount(req, res) {
  try {
    const memberId = req.user.id;
    const { channelId, account, homeUrl, fansCount, friendsCount, postsCount } = req.body;
    
    // 检查是否已存在相同渠道的账号
    const existingAccount = await accountModel.getByMemberAndChannel(memberId, channelId);
    
    if (existingAccount) {
      return responseUtil.badRequest(res, '您已添加过该渠道的账号');
    }
    
    // 添加账号
    const accountData = {
      memberId,
      channelId,
      account,
      homeUrl,
      fansCount: fansCount || 0,
      friendsCount: friendsCount || 0,
      postsCount: postsCount || 0,
      accountAuditStatus: 'pending'
    };
    
    const newAccount = await accountModel.create(accountData);
    
    return responseUtil.success(res, newAccount, '添加账号成功，请等待审核');
  } catch (error) {
    logger.error(`添加会员账号失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getAccounts,
  addAccount
}; 