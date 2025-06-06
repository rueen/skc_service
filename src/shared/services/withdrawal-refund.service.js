/**
 * 提现余额退回服务
 * 提供幂等性保障的余额退回功能，防止重复退回
 */
const { pool } = require('../models/db');
const logger = require('../config/logger.config');
const memberBalanceModel = require('../models/member-balance.model');

/**
 * 安全地退回提现余额（幂等操作）
 * @param {string} billNo - 账单编号
 * @param {string} reason - 退回原因
 * @param {Object} connection - 可选的数据库连接（用于事务）
 * @returns {Promise<Object>} 退回结果
 */
async function refundWithdrawalBalance(billNo, reason, connection = null) {
  const conn = connection || await pool.getConnection();
  const shouldManageTransaction = !connection;
  
  try {
    if (shouldManageTransaction) {
      await conn.beginTransaction();
    }
    
    // 1. 查询bills表记录并加锁，防止并发问题
    const [billRows] = await conn.query(
      `SELECT id, member_id, amount, withdrawal_status, settlement_status, withdrawal_id
       FROM bills 
       WHERE bill_no = ? AND bill_type = 'withdrawal'
       FOR UPDATE`,
      [billNo]
    );
    
    if (billRows.length === 0) {
      logger.warn(`未找到账单记录: ${billNo}`);
      if (shouldManageTransaction) {
        await conn.commit();
      }
      return { success: false, message: '未找到对应的账单记录', alreadyRefunded: false };
    }
    
    const bill = billRows[0];
    
    // 2. 检查是否已经退回过余额
    // 如果withdrawal_status已经是failed且settlement_status也是failed，说明已经处理过
    if (bill.withdrawal_status === 'failed' && bill.settlement_status === 'failed') {
      logger.info(`账单 ${billNo} 已经退回过余额，跳过重复处理`);
      if (shouldManageTransaction) {
        await conn.commit();
      }
      return { success: true, message: '余额已经退回过，跳过重复处理', alreadyRefunded: true };
    }
    
    // 3. 检查提现记录状态
    if (bill.withdrawal_id) {
      const [withdrawalRows] = await conn.query(
        'SELECT withdrawal_status FROM withdrawals WHERE id = ? FOR UPDATE',
        [bill.withdrawal_id]
      );
      
      if (withdrawalRows.length > 0 && withdrawalRows[0].withdrawal_status === 'success') {
        logger.warn(`提现记录 ${bill.withdrawal_id} 已经成功，不应退回余额`);
        if (shouldManageTransaction) {
          await conn.commit();
        }
        return { success: false, message: '提现已成功，不能退回余额', alreadyRefunded: false };
      }
    }
    
    // 4. 计算应退回的金额（bills表中提现记录的amount为负数）
    const refundAmount = Math.abs(parseFloat(bill.amount));
    
    // 5. 退回余额到会员账户
    await memberBalanceModel.updateBalance(
      bill.member_id,
      refundAmount,
      {
        transactionType: `withdrawal_refund: ${billNo}`,
        connection: conn
      }
    );
    
    // 6. 更新bills表状态，标记为已失败和已退回
    await conn.query(
      `UPDATE bills 
       SET withdrawal_status = 'failed', 
           settlement_status = 'failed', 
           failure_reason = ?
       WHERE id = ?`,
      [reason, bill.id]
    );
    
    if (shouldManageTransaction) {
      await conn.commit();
    }
    
    logger.info(`成功退回提现余额: 账单=${billNo}, 会员=${bill.member_id}, 金额=${refundAmount}, 原因=${reason}`);
    
    return {
      success: true,
      message: '余额退回成功',
      data: {
        billNo,
        memberId: bill.member_id,
        refundAmount: refundAmount.toFixed(2),
        reason
      },
      alreadyRefunded: false
    };
    
  } catch (error) {
    if (shouldManageTransaction) {
      await conn.rollback();
    }
    logger.error(`退回提现余额失败: 账单=${billNo}, 错误=${error.message}`);
    throw error;
  } finally {
    if (shouldManageTransaction) {
      conn.release();
    }
  }
}

module.exports = {
  refundWithdrawalBalance
}; 