/**
 * 提现账户模型
 * 处理提现账户相关数据操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { convertToCamelCase } = require('../utils/data.util');
const { formatDateTime } = require('../utils/date.util');

function formatWithdrawalAccount(withdrawalAccount) {
  if (!withdrawalAccount) return null;

  // 转换字段名称为驼峰命名法
  const formattedWithdrawalAccount = convertToCamelCase({
    ...withdrawalAccount,
    createTime: formatDateTime(withdrawalAccount.create_time),
    updateTime: formatDateTime(withdrawalAccount.update_time)
  })
  return formattedWithdrawalAccount;
}

/**
 * 创建提现账户
 * @param {Object} accountData - 提现账户数据
 * @returns {Promise<Object>} - 创建的提现账户对象
 */
async function createWithdrawalAccount(accountData) {
  try {
    const { memberId, paymentChannelId, account, name } = accountData;
    
    const [result] = await pool.query(
      `INSERT INTO withdrawal_accounts 
      (member_id, payment_channel_id, account, name) 
      VALUES (?, ?, ?, ?)`,
      [memberId, paymentChannelId, account, name]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('创建提现账户失败');
    }
    
    const createdAccount = {
      id: result.insertId,
      member_id: memberId,
      payment_channel_id: paymentChannelId,
      account,
      name,
      create_time: new Date()
    };
    
    return formatWithdrawalAccount(createdAccount);
  } catch (error) {
    logger.error(`创建提现账户失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新提现账户
 * @param {number} id - 提现账户ID
 * @param {Object} accountData - 提现账户数据
 * @returns {Promise<Object>} - 更新后的提现账户对象
 */
async function updateWithdrawalAccount(id, accountData) {
  try {
    const { paymentChannelId, account, name } = accountData;
    
    const [result] = await pool.query(
      `UPDATE withdrawal_accounts 
      SET payment_channel_id = ?, account = ?, name = ? 
      WHERE id = ?`,
      [paymentChannelId, account, name, id]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('更新提现账户失败');
    }
    
    const updatedAccount = {
      id,
      payment_channel_id: paymentChannelId,
      account,
      name,
      update_time: new Date()
    };
    
    return formatWithdrawalAccount(updatedAccount);
  } catch (error) {
    logger.error(`更新提现账户失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员的提现账户列表
 * @param {number} memberId - 会员ID
 * @returns {Promise<Array>} - 提现账户列表
 */
async function getWithdrawalAccountsByMemberId(memberId) {
  try {
    const [accounts] = await pool.query(
      `SELECT * FROM withdrawal_accounts WHERE member_id = ? ORDER BY create_time DESC`,
      [memberId]
    );
    
    return accounts.map(formatWithdrawalAccount);
  } catch (error) {
    logger.error(`获取会员提现账户列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取提现账户
 * @param {number} id - 提现账户ID
 * @returns {Promise<Object|null>} - 提现账户对象
 */
async function getWithdrawalAccountById(id) {
  try {
    const [accounts] = await pool.query(
      `SELECT * FROM withdrawal_accounts WHERE id = ?`,
      [id]
    );
    
    return formatWithdrawalAccount(accounts[0]);
  } catch (error) {
    logger.error(`根据ID获取提现账户失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除提现账户
 * @param {number} id - 提现账户ID
 * @param {number} memberId - 会员ID，用于验证账户所有权
 * @returns {Promise<boolean>} - 删除结果
 */
async function deleteWithdrawalAccount(id, memberId) {
  try {
    const [result] = await pool.query(
      `DELETE FROM withdrawal_accounts WHERE id = ? AND member_id = ?`,
      [id, memberId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`删除提现账户失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createWithdrawalAccount,
  updateWithdrawalAccount,
  getWithdrawalAccountsByMemberId,
  getWithdrawalAccountById,
  deleteWithdrawalAccount
}; 