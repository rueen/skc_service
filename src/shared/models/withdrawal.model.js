/**
 * 提现记录模型
 * 处理提现记录相关数据操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { WithdrawalStatus } = require('../config/enums');
const memberModel = require('./member.model');
const billModel = require('./bill.model');
const { BillType } = require('../config/enums');

/**
 * 创建提现申请
 * @param {Object} withdrawalData - 提现数据
 * @returns {Promise<Object>} - 创建的提现记录对象
 */
async function createWithdrawal(withdrawalData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { member_id, withdrawal_account_id, amount } = withdrawalData;
    
    // 检查会员余额是否充足
    const member = await memberModel.getById(member_id);
    if (!member || member.balance - amount < 0) {
      throw new Error('账户余额不足');
    }
    
    // 冻结相应金额（从余额中扣除）
    await memberModel.updateMemberBalance(member_id, -amount);
    
    // 插入提现记录
    const [result] = await connection.query(
      `INSERT INTO withdrawals 
      (member_id, withdrawal_account_id, amount, withdrawal_status) 
      VALUES (?, ?, ?, ?)`,
      [member_id, withdrawal_account_id, amount, WithdrawalStatus.PENDING]
    );
    
    const withdrawalId = result.insertId;
    
    await billModel.createBill({
      memberId: member_id,
      billType: BillType.WITHDRAWAL,
      amount: -amount,
      taskId: null,
      relatedGroupId: null
    }, connection);
    
    await connection.commit();
    
    return {
      id: withdrawalId,
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建提现申请失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取会员的提现记录列表
 * @param {number} memberId - 会员ID
 * @param {Object} options - 查询选项（分页、状态筛选等）
 * @returns {Promise<Object>} - 提现记录列表和总数
 */
async function getWithdrawalsByMemberId(memberId, options = {}) {
  try {
    const { page = 1, pageSize = 10, withdrawalStatus } = options;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE w.member_id = ?';
    const queryParams = [memberId];
    
    if (withdrawalStatus) {
      whereClause += ' AND w.withdrawal_status = ?';
      queryParams.push(withdrawalStatus);
    }
    
    // 查询总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM withdrawals w ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;
    
    // 查询提现记录列表
    const [withdrawals] = await pool.query(
      `SELECT w.*, wa.account_type, wa.account, wa.name
       FROM withdrawals w
       LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
       ${whereClause}
       ORDER BY w.create_time DESC
       LIMIT ?, ?`,
      [...queryParams, offset, parseInt(pageSize)]
    );
    
    return {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      list: withdrawals
    };
  } catch (error) {
    logger.error(`获取会员提现记录列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有提现记录（管理后台使用）
 * @param {Object} options - 查询选项（分页、状态筛选等）
 * @returns {Promise<Object>} - 提现记录列表和总数
 */
async function getAllWithdrawals(options = {}) {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      withdrawalStatus, 
      memberId,
      startTime,
      endTime
    } = options;
    const offset = (page - 1) * pageSize;
    
    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    
    if (withdrawalStatus) {
      whereClause += ' AND w.withdrawal_status = ?';
      queryParams.push(withdrawalStatus);
    }
    
    if (memberId) {
      whereClause += ' AND w.member_id = ?';
      queryParams.push(memberId);
    }
    
    if (startTime) {
      whereClause += ' AND w.create_time >= ?';
      queryParams.push(startTime);
    }
    
    if (endTime) {
      whereClause += ' AND w.create_time <= ?';
      queryParams.push(endTime);
    }
    
    // 查询总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM withdrawals w ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;
    
    // 查询提现记录列表
    const [withdrawals] = await pool.query(
      `SELECT w.*, wa.account_type, wa.account, wa.name, m.member_nickname, m.member_account
       FROM withdrawals w
       LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
       LEFT JOIN members m ON w.member_id = m.id
       ${whereClause}
       ORDER BY w.create_time DESC
       LIMIT ?, ?`,
      [...queryParams, offset, parseInt(pageSize)]
    );
    
    return {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      list: withdrawals
    };
  } catch (error) {
    logger.error(`获取所有提现记录失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量审核提现申请（通过）
 * @param {Array<number>} ids - 提现记录ID数组
 * @param {number} waiterId - 审核员ID
 * @param {string} remark - 备注
 * @returns {Promise<boolean>} - 审核结果
 */
async function batchApproveWithdrawals(ids, waiterId, remark = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const now = new Date();
    
    // 更新提现记录状态
    const [result] = await connection.query(
      `UPDATE withdrawals 
       SET withdrawal_status = ?, waiter_id = ?, process_time = ?, remark = ? 
       WHERE id IN (?) AND withdrawal_status = ?`,
      [WithdrawalStatus.SUCCESS, waiterId, now, remark, ids, WithdrawalStatus.PENDING]
    );
    
    // 批量更新关联的账单状态
    for (const id of ids) {
      // 获取提现记录
      const [withdrawalRecords] = await connection.query(
        'SELECT * FROM withdrawals WHERE id = ?',
        [id]
      );
      
      if (withdrawalRecords.length > 0) {
        const withdrawal = withdrawalRecords[0];
        
        // 更新关联的账单状态
        await connection.query(
          `UPDATE bills 
           SET settlement_status = 'success' 
           WHERE member_id = ? AND bill_type = 'withdrawal' AND amount = ?`,
          [withdrawal.member_id, -withdrawal.amount]
        );
      }
    }
    
    await connection.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`批量审核提现申请（通过）失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 批量拒绝提现申请
 * @param {Array<number>} ids - 提现记录ID数组
 * @param {string} rejectReason - 拒绝原因
 * @param {number} waiterId - 审核员ID
 * @param {string} remark - 备注
 * @returns {Promise<boolean>} - 拒绝结果
 */
async function batchRejectWithdrawals(ids, rejectReason, waiterId, remark = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const now = new Date();
    
    // 获取提现记录
    const [withdrawalRecords] = await connection.query(
      'SELECT * FROM withdrawals WHERE id IN (?) AND withdrawal_status = ?',
      [ids, WithdrawalStatus.PENDING]
    );
    
    // 更新提现记录状态
    const [result] = await connection.query(
      `UPDATE withdrawals 
       SET withdrawal_status = ?, reject_reason = ?, waiter_id = ?, process_time = ?, remark = ? 
       WHERE id IN (?) AND withdrawal_status = ?`,
      [WithdrawalStatus.FAILED, rejectReason, waiterId, now, remark, ids, WithdrawalStatus.PENDING]
    );
    
    // 退还余额并更新账单状态
    for (const withdrawal of withdrawalRecords) {
      // 退还余额
      await memberModel.updateMemberBalance(withdrawal.member_id, withdrawal.amount);
      
      // 更新关联的账单状态
      await connection.query(
        `UPDATE bills 
         SET settlement_status = 'failed', failure_reason = ? 
         WHERE member_id = ? AND bill_type = 'withdrawal' AND amount = ?`,
        [rejectReason, withdrawal.member_id, -withdrawal.amount]
      );
    }
    
    await connection.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`批量拒绝提现申请失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  createWithdrawal,
  getWithdrawalsByMemberId,
  getAllWithdrawals,
  batchApproveWithdrawals,
  batchRejectWithdrawals
}; 