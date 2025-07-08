/**
 * H5端会员账号控制器
 * 处理H5端会员账号相关的业务逻辑
 */
const accountModel = require('../../shared/models/account.model');
const oldAccountsFbModel = require('../../shared/models/old-accounts-fb.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const i18n = require('../../shared/utils/i18n.util');

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
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('h5.account.notFound', req.lang));
    }
    
    const account = rows[0];
    
    // 检查账号是否属于当前会员
    if (account.member_id !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.account.noPermissionView', req.lang));
    }
    
    return responseUtil.success(res, accountModel.formatAccount(account));
  } catch (error) {
    logger.error(`获取账号详情失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.badRequest(res, i18n.t('h5.account.alreadyExists', req.lang));
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
    
    // 如果提供了uid，尝试关联FB老账号
    if (uid) {
      try {
        await oldAccountsFbModel.bindMember(uid, memberId);
      } catch (bindError) {
        logger.error(`关联FB老账号失败，但不影响账号创建: ${bindError.message}`);
        // 关联失败不影响账号创建的结果
      }
    }
    
    return responseUtil.success(res, newAccount, i18n.t('h5.account.addSuccess', req.lang));
  } catch (error) {
    logger.error(`添加会员账号失败: ${error.message}`);
    
    // 处理UID重复的特定错误
    if (error.message === '该账号已被使用，禁止重复绑定') {
      return responseUtil.badRequest(res, i18n.t('h5.account.duplicateBind', req.lang));
    }
    
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('h5.account.notFound', req.lang));
    }
    
    const accountInfo = rows[0];
    
    // 检查账号是否属于当前会员
    if (accountInfo.member_id !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.account.noPermissionUpdate', req.lang));
    }

    // 检查账号驳回次数限制
    const [systemConfigRows] = await pool.query(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      ['account_reject_times']
    );
    
    const maxRejectTimes = systemConfigRows.length > 0 ? parseInt(systemConfigRows[0].config_value, 10) : -1;
    
    // 如果系统配置不为-1（不限制），则检查驳回次数
    if (maxRejectTimes !== -1) {
      const currentRejectTimes = accountInfo.reject_times || 0;
      if (currentRejectTimes > maxRejectTimes) {
        return responseUtil.badRequest(res, i18n.t('h5.account.rejectTimesLimit', req.lang));
      }
    }
    let accountAuditStatus = 'pending';  // 修改后重置为待审核状态
    if(accountInfo.account_audit_status === 'approved'){
      accountAuditStatus = 'approved';
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
      accountAuditStatus: accountAuditStatus
    };
    
    // 调用模型的更新方法
    await accountModel.update(updateData);
    
    // 如果提供了uid，尝试关联FB老账号
    if (uid) {
      try {
        await oldAccountsFbModel.bindMember(uid, memberId);
      } catch (bindError) {
        logger.error(`关联FB老账号失败，但不影响账号更新: ${bindError.message}`);
        // 关联失败不影响账号更新的结果
      }
    }
    
    // 只返回成功消息，不再返回更新后的账号信息
    return responseUtil.success(res, { success: true }, i18n.t('h5.account.updateSuccess', req.lang));
  } catch (error) {
    logger.error(`更新账号失败: ${error.message}`);
    
    // 处理UID重复的特定错误
    if (error.message === '该账号已被使用，禁止重复绑定') {
      return responseUtil.badRequest(res, i18n.t('h5.account.duplicateBind', req.lang));
    }
    
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('h5.account.notFound', req.lang));
    }
    
    const accountInfo = rows[0];
    
    // 检查账号是否属于当前会员
    if (accountInfo.member_id !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.account.noPermissionDelete', req.lang));
    }
    
    // 调用模型的删除方法
    const result = await accountModel.remove(accountId);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`删除账号失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 根据主页链接查找UID
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function findUidByHomeUrl(req, res) {
  try {
    const { homeUrl } = req.body;
    
    if (!homeUrl) {
      return responseUtil.badRequest(res, '主页链接不能为空');
    }
    
    // 获取UID
    const uid = await oldAccountsFbModel.getUidByHomeUrl(homeUrl);
    
    return responseUtil.success(res, { uid });
  } catch (error) {
    logger.error(`根据主页链接查找UID失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getAccounts,
  getAccountDetail,
  addAccount,
  updateAccount,
  deleteAccount,
  findUidByHomeUrl
}; 