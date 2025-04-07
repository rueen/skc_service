/**
 * H5端会员控制器
 * 处理H5端会员相关的业务逻辑
 */
const memberModel = require('../../shared/models/member.model');
const accountModel = require('../../shared/models/account.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const memberBalanceModel = require('../../shared/models/member-balance.model');
const billModel = require('../../shared/models/bill.model');
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
    return responseUtil.serverError(res, '获取会员账号列表失败');
  }
}

/**
 * 获取账号详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAccountDetail(req, res) {
  try {
    const memberId = req.user.id;
    const accountId = parseInt(req.params.id, 10);
    
    if (isNaN(accountId)) {
      return responseUtil.badRequest(res, '无效的账号ID');
    }
    
    // 只查询账号表，不关联渠道表
    const query = `
      SELECT a.*
      FROM accounts a
      WHERE a.id = ?
      LIMIT 1
    `;
    
    const { pool } = require('../../shared/models/db');
    const [rows] = await pool.query(query, [accountId]);
    
    if (rows.length === 0) {
      return responseUtil.notFound(res, '账号不存在');
    }
    
    const account = rows[0];
    
    // 检查账号是否属于当前会员
    if (account.member_id !== memberId) {
      return responseUtil.forbidden(res, '无权查看此账号');
    }
    
    return responseUtil.success(res, accountModel.formatAccount(account));
  } catch (error) {
    logger.error(`获取账号详情失败: ${error.message}`);
    return responseUtil.serverError(res, '获取账号详情失败');
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
    const { channelId, account, uid, homeUrl, fansCount, friendsCount, postsCount } = req.body;
    
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
      uid,
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
    
    // 处理UID重复的特定错误
    if (error.message.includes('UID 已被使用')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '添加会员账号失败');
  }
}

/**
 * 更新账号信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateAccount(req, res) {
  try {
    const memberId = req.user.id;
    const accountId = parseInt(req.params.id, 10);
    
    if (isNaN(accountId)) {
      return responseUtil.badRequest(res, '无效的账号ID');
    }
    
    // 获取要更新的字段
    const { account, uid, homeUrl, fansCount, friendsCount, postsCount } = req.body;
    
    // 获取账号详情，检查是否存在以及是否属于当前会员
    const query = `
      SELECT a.*
      FROM accounts a
      WHERE a.id = ?
      LIMIT 1
    `;
    
    const { pool } = require('../../shared/models/db');
    const [rows] = await pool.query(query, [accountId]);
    
    if (rows.length === 0) {
      return responseUtil.notFound(res, '账号不存在');
    }
    
    const accountInfo = rows[0];
    
    // 检查账号是否属于当前会员
    if (accountInfo.member_id !== memberId) {
      return responseUtil.forbidden(res, '无权更新此账号');
    }
    
    // 准备更新数据
    const updateData = {
      id: accountId,
      account: account,
      uid: uid,
      homeUrl: homeUrl,
      fansCount: fansCount,
      friendsCount: friendsCount,
      postsCount: postsCount,
      accountAuditStatus: 'pending' // 修改后重置为待审核状态
    };
    
    // 调用模型的更新方法
    await accountModel.update(updateData);
    
    // 只返回成功消息，不再返回更新后的账号信息
    return responseUtil.success(res, { success: true }, '更新账号成功，请等待审核');
  } catch (error) {
    logger.error(`更新账号失败: ${error.message}`);
    
    // 处理UID重复的特定错误
    if (error.message.includes('UID 已被使用')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '更新账号失败');
  }
}

/**
 * 删除会员账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deleteAccount(req, res) {
  try {
    const memberId = req.user.id;
    const accountId = parseInt(req.params.id, 10);
    
    if (isNaN(accountId)) {
      return responseUtil.badRequest(res, '无效的账号ID');
    }
    
    // 获取账号详情，检查是否存在以及是否属于当前会员
    const query = `
      SELECT a.*
      FROM accounts a
      WHERE a.id = ?
      LIMIT 1
    `;
    
    const { pool } = require('../../shared/models/db');
    const [rows] = await pool.query(query, [accountId]);
    
    if (rows.length === 0) {
      return responseUtil.notFound(res, '账号不存在');
    }
    
    const accountInfo = rows[0];
    
    // 检查账号是否属于当前会员
    if (accountInfo.member_id !== memberId) {
      return responseUtil.forbidden(res, '无权删除此账号');
    }
    
    // 调用模型的删除方法
    const result = await accountModel.remove(accountId);
    
    return responseUtil.success(res, result, '删除账号成功');
  } catch (error) {
    logger.error(`删除账号失败: ${error.message}`);
    return responseUtil.serverError(res, '删除账号失败');
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
  getAccounts,
  getAccountDetail,
  addAccount,
  updateAccount,
  deleteAccount,
  getBalance,
  getBills
}; 