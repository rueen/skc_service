/**
 * H5端提现控制器
 * 处理提现相关的请求
 */
const withdrawalAccountModel = require('../../shared/models/withdrawal-account.model');
const withdrawalModel = require('../../shared/models/withdrawal.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 创建提现账户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function createWithdrawalAccount(req, res) {
  try {
    const { paymentChannelId, account, name, bankName, bankBranchName, bankAccountNature } = req.body;
    const memberId = req.user.id;
    
    const accountData = {
      memberId: memberId,
      paymentChannelId: paymentChannelId,
      account,
      name,
      bankName,
      bankBranchName,
      bankAccountNature
    };
    
    const createdAccount = await withdrawalAccountModel.createWithdrawalAccount(accountData);
    
    return responseUtil.success(res, createdAccount);
  } catch (error) {
    logger.error(`创建提现账户失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 更新提现账户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateWithdrawalAccount(req, res) {
  try {
    const { id } = req.params;
    const { paymentChannelId, account, name, bankName, bankBranchName, bankAccountNature } = req.body;
    const memberId = req.user.id;
    
    // 验证账户所有权
    const existingAccount = await withdrawalAccountModel.getWithdrawalAccountById(id);
    if (!existingAccount) {
      return responseUtil.notFound(res, i18n.t('h5.withdrawal.notFound', req.lang));
    }

    if (existingAccount.memberId !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.withdrawal.noPermissionUpdate', req.lang));
    }
    
    const accountData = {
      paymentChannelId: paymentChannelId,
      account,
      name,
      bankName,
      bankBranchName,
      bankAccountNature
    };
    
    const updatedAccount = await withdrawalAccountModel.updateWithdrawalAccount(id, accountData);
    
    return responseUtil.success(res, updatedAccount);
  } catch (error) {
    logger.error(`更新提现账户失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取提现账户列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getWithdrawalAccounts(req, res) {
  try {
    const memberId = req.user.id;
    
    const accounts = await withdrawalAccountModel.getWithdrawalAccountsByMemberId(memberId);
    
    return responseUtil.success(res, accounts);
  } catch (error) {
    logger.error(`获取提现账户列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 删除提现账户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deleteWithdrawalAccount(req, res) {
  try {
    const { id } = req.params;
    const memberId = req.user.id;
    
    const deleted = await withdrawalAccountModel.deleteWithdrawalAccount(id, memberId);
    
    if (!deleted) {
      return responseUtil.notFound(res, i18n.t('h5.withdrawal.noPermissionDelete', req.lang));
    }
    
    return responseUtil.success(res);
  } catch (error) {
    logger.error(`删除提现账户失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 申请提现
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function createWithdrawal(req, res) {
  try {
    const { withdrawalAccountId, amount } = req.body;
    const memberId = req.user.id;
    
    // 验证提现账户是否存在
    const account = await withdrawalAccountModel.getWithdrawalAccountById(withdrawalAccountId);
    if (!account) {
      return responseUtil.badRequest(res, i18n.t('h5.withdrawal.notFound', req.lang));
    }
    
    if (account.memberId !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.withdrawal.noPermissionUse', req.lang));
    }
    
    // 检查提现金额是否合法
    if (amount <= 0) {
      return responseUtil.badRequest(res, i18n.t('h5.withdrawal.amountLimit', req.lang));
    }
    
    // 检查用户是否有待处理的提现申请
    const hasPending = await withdrawalModel.hasPendingWithdrawal(memberId);
    if (hasPending) {
      return responseUtil.badRequest(res, i18n.t('h5.withdrawal.pendingWithdrawal', req.lang));
    }
    
    const withdrawalData = {
      member_id: memberId,
      withdrawal_account_id: withdrawalAccountId,
      amount
    };
    
    const withdrawal = await withdrawalModel.createWithdrawal(withdrawalData);
    
    return responseUtil.success(res, withdrawal);
  } catch (error) {
    logger.error(`申请提现失败: ${error.message}`);
    if (error.message === '账户余额不足') {
      return responseUtil.badRequest(res, i18n.t('h5.withdrawal.insufficientBalance', req.lang));
    }
    return responseUtil.serverError(res);
  }
}

/**
 * 获取提现记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getWithdrawals(req, res) {
  try {
    const memberId = req.user.id;
    const { page, pageSize, withdrawalStatus } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10
    };
    
    if (withdrawalStatus) {
      options.withdrawalStatus = withdrawalStatus;
    }
    
    const withdrawals = await withdrawalModel.getWithdrawalsByMemberId(memberId, options);
    
    return responseUtil.success(res, withdrawals);
  } catch (error) {
    logger.error(`获取提现记录失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  createWithdrawalAccount,
  updateWithdrawalAccount,
  getWithdrawalAccounts,
  deleteWithdrawalAccount,
  createWithdrawal,
  getWithdrawals
}; 