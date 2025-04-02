/**
 * H5端提现控制器
 * 处理提现相关的请求
 */
const withdrawalAccountModel = require('../../shared/models/withdrawal-account.model');
const withdrawalModel = require('../../shared/models/withdrawal.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');

/**
 * 创建提现账户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function createWithdrawalAccount(req, res) {
  try {
    const { accountType, account, name } = req.body;
    const memberId = req.user.id;
    
    const accountData = {
      memberId: memberId,
      accountType: accountType,
      account,
      name
    };
    
    const createdAccount = await withdrawalAccountModel.createWithdrawalAccount(accountData);
    
    return responseUtil.success(res, createdAccount);
  } catch (error) {
    logger.error(`创建提现账户失败: ${error.message}`);
    return responseUtil.serverError(res, '创建提现账户失败');
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
    const { accountType, account, name } = req.body;
    const memberId = req.user.id;
    
    // 验证账户所有权
    const existingAccount = await withdrawalAccountModel.getWithdrawalAccountById(id);
    if (!existingAccount) {
      return responseUtil.notFound(res, '提现账户不存在');
    }

    if (existingAccount.memberId !== memberId) {
      return responseUtil.forbidden(res, '没有权限修改此提现账户');
    }
    
    const accountData = {
      accountType: accountType,
      account,
      name
    };
    
    const updatedAccount = await withdrawalAccountModel.updateWithdrawalAccount(id, accountData);
    
    return responseUtil.success(res, updatedAccount);
  } catch (error) {
    logger.error(`更新提现账户失败: ${error.message}`);
    return responseUtil.serverError(res, '更新提现账户失败');
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
    return responseUtil.serverError(res, '获取提现账户列表失败');
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
      return responseUtil.notFound(res, '提现账户不存在或无权删除');
    }
    
    return responseUtil.success(res, { message: '提现账户删除成功' });
  } catch (error) {
    logger.error(`删除提现账户失败: ${error.message}`);
    return responseUtil.serverError(res, '删除提现账户失败');
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
      return responseUtil.badRequest(res, '提现账户不存在');
    }
    
    if (account.memberId !== memberId) {
      return responseUtil.forbidden(res, '没有权限使用此提现账户');
    }
    
    // 检查提现金额是否合法
    if (amount <= 0) {
      return responseUtil.badRequest(res, '提现金额必须大于0');
    }
    
    // 检查用户是否有待处理的提现申请
    const hasPending = await withdrawalModel.hasPendingWithdrawal(memberId);
    if (hasPending) {
      return responseUtil.badRequest(res, '您有待处理的提现申请，请等待处理完成后再申请');
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
      return responseUtil.badRequest(res, '账户余额不足');
    }
    return responseUtil.serverError(res, '申请提现失败');
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
    return responseUtil.serverError(res, '获取提现记录失败');
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