/**
 * 会员账户余额模型
 * 处理会员账户余额相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 获取会员已提现金额
 * @param {number} memberId - 会员ID
 * @returns {Promise<number>} 提现金额
 */
async function getWithdrawalAmount(memberId) {
  try {
    const [withdrawalRows] = await pool.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as withdrawalAmount 
      FROM bills 
      WHERE member_id = ? AND bill_type = 'withdrawal' AND (settlement_status = 'success' OR withdrawal_status = 'success')`,
    [memberId]
    );
    return withdrawalRows[0].withdrawalAmount || 0;
  } catch (error) {
    logger.error(`获取会员已提现金额失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员账户余额
 * @param {number} memberId - 会员ID
 * @returns {Promise<number>} 账户余额
 */
async function getBalance(memberId) {
  try {
    const [rows] = await pool.query(
      'SELECT balance FROM members WHERE id = ?',
      [memberId]
    );
    
    if (rows.length === 0) {
      throw new Error('会员不存在');
    }
    
    return parseFloat(rows[0].balance);
  } catch (error) {
    logger.error(`获取会员账户余额失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新会员账户余额
 * @param {number} memberId - 会员ID
 * @param {number} amount - 金额（正值为增加，负值为减少）
 * @param {Object} options - 其他选项
 * @param {string} options.transactionType - 交易类型，用于记录日志
 * @param {Object} options.connection - 可选的数据库连接，用于事务中的操作
 * @param {boolean} options.allowNegativeBalance - 是否允许余额为负数，默认为false
 * @returns {Promise<boolean>} 操作结果
 */
async function updateBalance(memberId, amount, options = {}) {
  const { 
    transactionType = '未知交易', 
    connection: existingConnection = null,
    allowNegativeBalance = false 
  } = options;
  const shouldReleaseConnection = !existingConnection;
  const connection = existingConnection || await pool.getConnection();
  
  try {
    if (shouldReleaseConnection) {
      await connection.beginTransaction();
    }
    
    // 检查会员是否存在
    const [members] = await connection.query(
      'SELECT id, balance FROM members WHERE id = ?',
      [memberId]
    );
    
    if (members.length === 0) {
      throw new Error('会员不存在');
    }
    
    const currentBalance = parseFloat(members[0].balance);
    const newBalance = currentBalance + parseFloat(amount);
    
    // 如果是减少余额，且不允许负数余额，则确保账户余额足够
    if (amount < 0 && newBalance < 0 && !allowNegativeBalance) {
      throw new Error('账户余额不足');
    }
    
    // 更新余额
    await connection.query(
      'UPDATE members SET balance = ? WHERE id = ?',
      [newBalance.toFixed(2), memberId]
    );
    
    // 记录余额变动日志
    await connection.query(
      `INSERT INTO balance_logs 
       (member_id, amount, before_balance, after_balance, transaction_type, create_time) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [memberId, amount, currentBalance.toFixed(2), newBalance.toFixed(2), transactionType]
    );
    
    if (shouldReleaseConnection) {
      await connection.commit();
    }
    
    return true;
  } catch (error) {
    if (shouldReleaseConnection) {
      await connection.rollback();
    }
    logger.error(`更新会员账户余额失败: ${error.message}`);
    throw error;
  } finally {
    if (shouldReleaseConnection) {
      connection.release();
    }
  }
}

module.exports = {
  getBalance,
  getWithdrawalAmount,
  updateBalance
}; 