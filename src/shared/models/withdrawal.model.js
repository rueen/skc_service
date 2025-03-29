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
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化提现记录，转换字段为驼峰命名
 * @param {Object} withdrawal - 提现记录
 * @returns {Object} 格式化后的提现记录
 */
function formatWithdrawal(withdrawal) {
  if (!withdrawal) return null;

  // 转换字段名称为驼峰命名法
  const formattedWithdrawal = convertToCamelCase({
    ...withdrawal,
    processTime: formatDateTime(withdrawal.process_time),
    createTime: formatDateTime(withdrawal.create_time),
    updateTime: formatDateTime(withdrawal.update_time)
  });
  
  return formattedWithdrawal;
}

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
    
    // 使用 formatWithdrawal 方法格式化列表数据
    const formattedList = withdrawals.map(withdrawal => formatWithdrawal(withdrawal));
    
    return {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      list: formattedList
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
      `SELECT w.*, wa.account_type, wa.account, wa.name, m.nickname, m.account
       FROM withdrawals w
       LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
       LEFT JOIN members m ON w.member_id = m.id
       ${whereClause}
       ORDER BY w.create_time DESC
       LIMIT ?, ?`,
      [...queryParams, offset, parseInt(pageSize)]
    );
    
    // 使用 formatWithdrawal 方法格式化列表数据
    const formattedList = withdrawals.map(withdrawal => formatWithdrawal(withdrawal));
    
    return {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      list: formattedList
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
        
        // 更新关联的账单提现状态
        await connection.query(
          `UPDATE bills 
           SET withdrawal_status = ? 
           WHERE member_id = ? AND bill_type = ? AND amount = ?`,
          [WithdrawalStatus.SUCCESS, withdrawal.member_id, BillType.WITHDRAWAL, -withdrawal.amount]
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
      
      // 更新关联的账单提现状态
      await connection.query(
        `UPDATE bills 
         SET withdrawal_status = ?, failure_reason = ? 
         WHERE member_id = ? AND bill_type = ? AND amount = ?`,
        [WithdrawalStatus.FAILED, rejectReason, withdrawal.member_id, BillType.WITHDRAWAL, -withdrawal.amount]
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

/**
 * 导出提现列表数据（不分页，用于导出）
 * @param {Object} filters - 筛选条件
 * @param {number} filters.memberId - 会员ID
 * @param {string} filters.memberNickname - 会员昵称
 * @param {number} filters.withdrawalStatus - 提现状态
 * @param {string} filters.billNo - 账单编号
 * @param {string} filters.startDate - 开始日期
 * @param {string} filters.endDate - 结束日期
 * @returns {Promise<Array>} 提现记录列表
 */
async function exportWithdrawals(filters = {}) {
  try {
    let baseQuery = `
      SELECT w.*, 
             m.nickname,
             wa.account_type as withdrawal_account_type,
             wa.account as withdrawal_account,
             wa.name as withdrawal_name
      FROM withdrawals w
      LEFT JOIN members m ON w.member_id = m.id
      LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
    `;
    
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.memberId) {
      conditions.push('w.member_id = ?');
      queryParams.push(filters.memberId);
    }
    
    if (filters.memberNickname) {
      conditions.push('m.nickname LIKE ?');
      queryParams.push(`%${filters.memberNickname}%`);
    }
    
    if (filters.withdrawalStatus) {
      conditions.push('w.withdrawal_status = ?');
      queryParams.push(filters.withdrawalStatus);
    }
    
    if (filters.billNo) {
      conditions.push('w.bill_no LIKE ?');
      queryParams.push(`%${filters.billNo}%`);
    }
    
    // 日期范围过滤
    if (filters.startDate) {
      conditions.push('w.create_time >= ?');
      queryParams.push(`${filters.startDate} 00:00:00`);
    }
    
    if (filters.endDate) {
      conditions.push('w.create_time <= ?');
      queryParams.push(`${filters.endDate} 23:59:59`);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      baseQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // 添加排序
    baseQuery += ' ORDER BY w.create_time DESC';

    // 执行查询
    const [withdrawals] = await pool.query(baseQuery, queryParams);
    
    // 使用 formatWithdrawal 方法格式化提现记录
    const formattedWithdrawals = withdrawals.map(withdrawal => formatWithdrawal(withdrawal));
    
    return formattedWithdrawals;
  } catch (error) {
    logger.error(`导出提现列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createWithdrawal,
  getWithdrawalsByMemberId,
  getAllWithdrawals,
  batchApproveWithdrawals,
  batchRejectWithdrawals,
  exportWithdrawals
}; 