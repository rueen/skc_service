/**
 * 交易处理服务
 * 处理交易状态变更、提现记录更新和余额管理
 */
const { pool } = require('../models/db');
const logger = require('../config/logger.config');

/**
 * 处理失败的交易
 * 更新提现记录、账单状态并退还余额
 * @param {string} orderId - 订单ID
 * @param {string} reason - 失败原因
 */
async function handleFailedTransaction(orderId, reason) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 获取交易详情并加排他锁
    const [transactions] = await connection.query(
      'SELECT * FROM payment_transactions WHERE order_id = ? FOR UPDATE',
      [orderId]
    );
    
    if (transactions.length === 0) {
      logger.error(`处理失败交易时找不到订单 ${orderId}`);
      await connection.rollback();
      return false;
    }
    
    const transaction = transactions[0];
    
    // 检查交易状态，如果已经是终态就跳过处理
    if (transaction.transaction_status === 'success' || transaction.transaction_status === 'failed') {
      logger.info(`交易 ${orderId} 已经处于终态 ${transaction.transaction_status}，跳过处理`);
      await connection.commit();
      return true;
    }
    
    const withdrawalId = transaction.withdrawal_id;
    const memberId = transaction.member_id;
    const amount = transaction.amount;

    // 检查提现状态，避免重复退款，也加排他锁
    const [withdrawalRows] = await connection.query(
      'SELECT withdrawal_status FROM withdrawals WHERE id = ? FOR UPDATE',
      [withdrawalId]
    );
    
    if (withdrawalRows.length === 0) {
      logger.error(`找不到提现记录 ${withdrawalId}`);
      await connection.rollback();
      return false;
    }
    
    // 如果提现已经是终态，避免重复处理
    if (withdrawalRows[0].withdrawal_status === 'success' || withdrawalRows[0].withdrawal_status === 'failed') {
      logger.info(`提现 ${withdrawalId} 已经处于终态 ${withdrawalRows[0].withdrawal_status}，避免重复处理`);
      
      // 确保更新交易状态为失败，保持数据一致性
      await connection.query(
        'UPDATE payment_transactions SET transaction_status = ?, error_message = ?, response_time = NOW() WHERE order_id = ?',
        ['failed', reason, orderId]
      );
      
      await connection.commit();
      return true;
    }
    
    // 1. 更新提现记录状态为失败
    await connection.query(
      'UPDATE withdrawals SET withdrawal_status = ?, reject_reason = ?, process_time = NOW() WHERE id = ?',
      ['failed', reason, withdrawalId]
    );
    
    // 2. 更新相关账单记录状态为失败
    await connection.query(
      'UPDATE bills SET settlement_status = ?, withdrawal_status = ?, failure_reason = ? WHERE bill_type = "withdrawal" AND withdrawal_id = ?',
      ['failed', 'failed', reason, withdrawalId]
    );
    
    // 3. 退还会员余额
    // 先查询会员当前余额
    const [memberRows] = await connection.query(
      'SELECT balance FROM members WHERE id = ?',
      [memberId]
    );
    
    if (memberRows.length === 0) {
      logger.error(`找不到会员ID ${memberId}，无法退还余额`);
      await connection.rollback();
      return false;
    }
    
    const currentBalance = parseFloat(memberRows[0].balance);
    const newBalance = currentBalance + parseFloat(amount);
    
    // 更新会员余额
    await connection.query(
      'UPDATE members SET balance = ? WHERE id = ?',
      [newBalance, memberId]
    );
    
    // 记录余额变动日志
    await connection.query(
      'INSERT INTO balance_logs (member_id, amount, before_balance, after_balance, transaction_type, create_time) VALUES (?, ?, ?, ?, ?, NOW())',
      [memberId, amount, currentBalance, newBalance, 'withdrawal_refund']
    );
    
    // 更新交易状态为失败
    await connection.query(
      'UPDATE payment_transactions SET transaction_status = ?, error_message = ?, response_time = NOW() WHERE order_id = ?',
      ['failed', reason, orderId]
    );
    
    await connection.commit();
    logger.info(`已成功处理失败交易 ${orderId}：更新提现记录、账单状态并退还会员余额 ${amount}元`);
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`处理失败交易 ${orderId} 时出错: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * 处理成功的交易
 * 更新提现记录和账单状态
 * @param {string} orderId - 订单ID
 */
async function handleSuccessTransaction(orderId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 获取交易详情并加排他锁
    const [transactions] = await connection.query(
      'SELECT * FROM payment_transactions WHERE order_id = ? FOR UPDATE',
      [orderId]
    );
    
    if (transactions.length === 0) {
      logger.error(`处理成功交易时找不到订单 ${orderId}`);
      await connection.rollback();
      return false;
    }
    
    const transaction = transactions[0];
    
    // 检查交易状态，如果已经是终态就跳过处理
    if (transaction.transaction_status === 'success' || transaction.transaction_status === 'failed') {
      logger.info(`交易 ${orderId} 已经处于终态 ${transaction.transaction_status}，跳过处理`);
      await connection.commit();
      return true;
    }
    
    const withdrawalId = transaction.withdrawal_id;
    
    // 检查提现状态，避免重复处理，也加排他锁
    const [withdrawalRows] = await connection.query(
      'SELECT withdrawal_status FROM withdrawals WHERE id = ? FOR UPDATE',
      [withdrawalId]
    );
    
    if (withdrawalRows.length === 0) {
      logger.error(`找不到提现记录 ${withdrawalId}`);
      await connection.rollback();
      return false;
    }
    
    // 如果提现已经是终态，避免重复处理
    if (withdrawalRows[0].withdrawal_status === 'success' || withdrawalRows[0].withdrawal_status === 'failed') {
      logger.info(`提现 ${withdrawalId} 已经处于终态 ${withdrawalRows[0].withdrawal_status}，避免重复处理`);
      
      // 如果提现已经失败，但交易状态是成功，记录日志但不修改状态
      if (withdrawalRows[0].withdrawal_status === 'failed') {
        logger.warn(`提现 ${withdrawalId} 已经处理为失败状态，但交易 ${orderId} 显示成功，数据不一致`);
      }
      
      // 确保更新交易状态为成功，保持数据一致性
      await connection.query(
        'UPDATE payment_transactions SET transaction_status = ?, response_time = NOW() WHERE order_id = ?',
        ['success', orderId]
      );
      
      await connection.commit();
      return true;
    }
    
    // 1. 更新提现记录状态为成功
    await connection.query(
      'UPDATE withdrawals SET withdrawal_status = ?, process_time = NOW() WHERE id = ?',
      ['success', withdrawalId]
    );
    
    // 2. 更新相关账单记录状态为成功
    await connection.query(
      'UPDATE bills SET settlement_status = ?, withdrawal_status = ? WHERE bill_type = "withdrawal" AND withdrawal_id = ?',
      ['success', 'success', withdrawalId]
    );
    
    // 3. 更新交易状态为成功
    await connection.query(
      'UPDATE payment_transactions SET transaction_status = ?, response_time = NOW() WHERE order_id = ?',
      ['success', orderId]
    );
    
    await connection.commit();
    logger.info(`已成功处理成功交易 ${orderId}：更新提现记录和账单状态`);
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`处理成功交易 ${orderId} 时出错: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * 直接更新提现记录状态（不通过订单ID）
 * 用于直接处理提现请求的情况
 * @param {number} withdrawalId - 提现ID
 * @param {string} status - 状态：success/failed
 * @param {string} reason - 失败原因（仅当status为failed时需要）
 */
async function updateWithdrawalStatus(withdrawalId, status, reason = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 获取提现详情，添加排他锁防止并发操作
    const [withdrawals] = await connection.query(
      'SELECT * FROM withdrawals WHERE id = ? FOR UPDATE',
      [withdrawalId]
    );
    
    if (withdrawals.length === 0) {
      logger.error(`找不到提现记录 ${withdrawalId}`);
      await connection.rollback();
      return false;
    }
    
    const withdrawal = withdrawals[0];
    const memberId = withdrawal.member_id;
    const amount = withdrawal.amount;
    
    // 检查提现状态，避免重复退款
    // 如果已经是终态(success/failed)，则不再处理
    if (withdrawal.withdrawal_status === 'success' || withdrawal.withdrawal_status === 'failed') {
      logger.info(`提现 ${withdrawalId} 已经处于终态 ${withdrawal.withdrawal_status}，避免重复处理`);
      await connection.commit();
      return true;
    }
    
    if (status === 'success') {
      // 更新提现记录状态为成功
      await connection.query(
        'UPDATE withdrawals SET withdrawal_status = ?, process_time = NOW() WHERE id = ?',
        ['success', withdrawalId]
      );
      
      // 更新相关账单记录状态为成功
      await connection.query(
        'UPDATE bills SET settlement_status = ?, withdrawal_status = ? WHERE bill_type = "withdrawal" AND withdrawal_id = ?',
        ['success', 'success', withdrawalId]
      );
      
      logger.info(`提现ID ${withdrawalId} 状态已更新为成功`);
    } else if (status === 'failed') {
      // 更新提现记录状态为失败
      await connection.query(
        'UPDATE withdrawals SET withdrawal_status = ?, reject_reason = ?, process_time = NOW() WHERE id = ?',
        ['failed', reason || '提现失败', withdrawalId]
      );
      
      // 更新相关账单记录状态为失败
      await connection.query(
        'UPDATE bills SET settlement_status = ?, withdrawal_status = ?, failure_reason = ? WHERE bill_type = "withdrawal" AND withdrawal_id = ?',
        ['failed', 'failed', reason || '提现失败', withdrawalId]
      );
      
      // 退还余额
      // 先查询会员当前余额
      const [memberRows] = await connection.query(
        'SELECT balance FROM members WHERE id = ?',
        [memberId]
      );
      
      if (memberRows.length === 0) {
        logger.error(`找不到会员ID ${memberId}，无法退还余额`);
        await connection.rollback();
        return false;
      }
      
      const currentBalance = parseFloat(memberRows[0].balance);
      const newBalance = currentBalance + parseFloat(amount);
      
      // 更新会员余额
      await connection.query(
        'UPDATE members SET balance = ? WHERE id = ?',
        [newBalance, memberId]
      );
      
      // 记录余额变动日志
      await connection.query(
        'INSERT INTO balance_logs (member_id, amount, before_balance, after_balance, transaction_type, create_time) VALUES (?, ?, ?, ?, ?, NOW())',
        [memberId, amount, currentBalance, newBalance, 'withdrawal_refund']
      );
      
      logger.info(`提现ID ${withdrawalId} 状态已更新为失败，余额已退还`);
    } else {
      logger.error(`无效的提现状态: ${status}`);
      await connection.rollback();
      return false;
    }
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新提现记录状态失败: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

module.exports = {
  handleFailedTransaction,
  handleSuccessTransaction,
  updateWithdrawalStatus
}; 