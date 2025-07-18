/**
 * 提现记录模型
 * 处理提现记录相关数据操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { WithdrawalStatus } = require('../config/enums');
const memberModel = require('./member.model');
const billModel = require('./bill.model');
const { BillType } = require('../config/enums');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');
const { decrypt, isEncrypted } = require('../utils/encryption.util');
const transactionHandler = require('../services/transaction-handler.service');
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
    
    // 生成唯一的账单编号
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const billNo = `WIT${timestamp}${randomNum}`;
    
    // 插入提现记录
    const [result] = await connection.query(
      `INSERT INTO withdrawals 
      (bill_no, member_id, withdrawal_account_id, amount, withdrawal_status) 
      VALUES (?, ?, ?, ?, ?)`,
      [billNo, member_id, withdrawal_account_id, amount, WithdrawalStatus.PENDING]
    );
    
    const withdrawalId = result.insertId;
    
    // 创建账单记录，使用相同的 billNo
    await billModel.createBill({
      memberId: member_id,
      billType: BillType.WITHDRAWAL,
      amount: -amount,
      taskId: null,
      withdrawalId: withdrawalId,
      relatedGroupId: null,
      billNo: billNo // 传递相同的账单编号
    }, connection);
    
    await connection.commit();
    
    return {
      id: withdrawalId,
      billNo
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
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, withdrawalStatus } = options;
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
    
    // 查询提现记录列表，增加支付渠道名称
    const [withdrawals] = await pool.query(
      `SELECT w.*, 
              wa.payment_channel_id, 
              wa.account, 
              wa.name as withdrawal_name, 
              pc.name as payment_channel_name
       FROM withdrawals w
       LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
       LEFT JOIN payment_channels pc ON wa.payment_channel_id = pc.id
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
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      withdrawalStatus, 
      memberId,
      paymentChannelId,
      startTime,
      endTime,
      billNo,
      memberNickname,
      exportMode = false
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
    
    if (paymentChannelId) {
      whereClause += ' AND wa.payment_channel_id = ?';
      queryParams.push(paymentChannelId);
    }
    
    if (startTime) {
      whereClause += ' AND w.create_time >= ?';
      queryParams.push(startTime);
    }
    
    if (endTime) {
      whereClause += ' AND w.create_time <= ?';
      queryParams.push(endTime);
    }
    
    if (billNo) {
      whereClause += ' AND w.bill_no LIKE ?';
      queryParams.push(`%${billNo}%`);
    }
    
    if (memberNickname) {
      whereClause += ' AND m.nickname LIKE ?';
      queryParams.push(`%${memberNickname}%`);
    }
    
    // 查询总数和总金额
    const [countResult] = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COALESCE(SUM(w.amount), 0) AS totalAmount
      FROM withdrawals w 
       LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
       LEFT JOIN members m ON w.member_id = m.id
       ${whereClause}`,
      queryParams
    );
    const total = countResult[0].total;
    const totalAmount = parseFloat(countResult[0].totalAmount) || 0;
    
    // 构建基础查询
    let query = `SELECT w.*, 
              wa.payment_channel_id, 
              wa.account, 
              wa.name as withdrawal_name, 
              m.nickname, 
              m.account as member_account, 
              pc.name as payment_channel_name,
              wtr.username as waiter_name
       FROM withdrawals w
       LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
       LEFT JOIN members m ON w.member_id = m.id
       LEFT JOIN payment_channels pc ON wa.payment_channel_id = pc.id
       LEFT JOIN waiters wtr ON w.waiter_id = wtr.id
       ${whereClause}
       ORDER BY w.create_time DESC`;
    
    // 根据exportMode决定是否添加分页
    if (!exportMode) {
      query += ' LIMIT ?, ?';
      queryParams.push(offset, parseInt(pageSize));
    }
    
    // 查询提现记录列表
    const [withdrawals] = await pool.query(query, queryParams);
    
    // 使用 formatWithdrawal 方法格式化列表数据
    const formattedList = withdrawals.map(withdrawal => formatWithdrawal(withdrawal));
    
    return {
      total,
      totalAmount,
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
    
    // 先查询提现状态并加排他锁(X锁)，防止并发问题
    const [pendingWithdrawals] = await connection.query(
      `SELECT 
        id, member_id, amount, bill_no, withdrawal_account_id 
      FROM withdrawals 
      WHERE id IN (?) AND withdrawal_status = ?
      FOR UPDATE`,
      [ids, WithdrawalStatus.PENDING]
    );
    
    // 过滤出状态为pending的提现记录ID
    const pendingIds = pendingWithdrawals.map(withdrawal => withdrawal.id);
    
    if (pendingIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    const now = new Date();
    
    // 更新提现记录状态，只更新pending状态的记录
    const [result] = await connection.query(
      `UPDATE withdrawals 
       SET withdrawal_status = ?, waiter_id = ?, process_time = ?, remark = ? 
       WHERE id IN (?) AND withdrawal_status = ?`,
      [WithdrawalStatus.PROCESSING, waiterId, now, remark, pendingIds, WithdrawalStatus.PENDING]
    );
    
    // 批量更新关联的账单状态，使用withdrawal_id精确匹配
    if (pendingIds.length > 0) {
      const placeholders = pendingIds.map(() => '?').join(',');
      await connection.query(
        `UPDATE bills 
         SET withdrawal_status = ? 
         WHERE withdrawal_id IN (${placeholders}) AND bill_type = ?`,
        [WithdrawalStatus.PROCESSING, ...pendingIds, BillType.WITHDRAWAL]
      );
    }

    // 处理每个提现记录的第三方代付
    for (const withdrawal of pendingWithdrawals) {
      // 获取提现记录的详细信息，包括提现账户信息
      const [withdrawalDetails] = await connection.query(
        `SELECT w.*, 
                wa.account, 
                wa.name as account_name, 
                wa.payment_channel_id,
                pc.merchant_id,
                pc.secret_key,
                pc.bank
         FROM withdrawals w
         LEFT JOIN withdrawal_accounts wa ON w.withdrawal_account_id = wa.id
         LEFT JOIN payment_channels pc ON wa.payment_channel_id = pc.id
         WHERE w.id = ?`,
        [withdrawal.id]
      );

      if (withdrawalDetails.length > 0) {
        // 异步发起第三方代付，不等待结果，不影响审核流程
        // 使用process.nextTick确保不阻塞主线程
        process.nextTick(async () => {
          try {
            await processThirdPartyPayment(formatWithdrawal(withdrawalDetails[0]));
          } catch (error) {
            logger.error(`提现ID ${withdrawal.id} 的第三方代付处理失败: ${error.message}`);
          }
        });
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
 * 处理第三方代付请求
 * @param {Object} withdrawalDetail - 提现详情
 * @returns {Promise<void>}
 */
async function processThirdPartyPayment(withdrawalDetail) {
  const paymentUtil = require('../utils/payment.util');
  const paymentTransactionModel = require('./payment-transaction.model');

  // 如果是加密的密钥，先解密
  if (isEncrypted(withdrawalDetail.secretKey)) {
    withdrawalDetail.secretKey = decrypt(withdrawalDetail.secretKey);
  }
  // 创建订单号
  const orderId = withdrawalDetail.billNo;
  
  try {
    // 记录请求开始
    logger.info(`开始处理提现ID ${withdrawalDetail.id} 的第三方代付，订单号: ${orderId}`);
    // 创建支付交易记录
    const requestParams = {
      merchant: withdrawalDetail.merchantId,
      order_id: orderId,
      bank: withdrawalDetail.bank,
      total_amount: withdrawalDetail.amount,
      bank_card_account: withdrawalDetail.account,
      bank_card_name: withdrawalDetail.accountName,
      bank_card_remark: 'no',
      callback_url: 'no'
    };
    
    const transactionData = {
      orderId: orderId,
      withdrawalId: withdrawalDetail.id,
      memberId: withdrawalDetail.memberId,
      paymentChannelId: withdrawalDetail.paymentChannelId,
      amount: withdrawalDetail.amount,
      account: withdrawalDetail.account,
      accountName: withdrawalDetail.accountName,
      transactionStatus: 'pending',
      requestParams: requestParams,
      requestTime: new Date()
    };
    
    // 创建交易记录
    const transaction = await paymentTransactionModel.createTransaction(transactionData);
    
    // 配置API参数
    const apiUrl = process.env.PAYMENT_API_URL;
    
    // 确保amount是数字类型
    let formattedAmount;
    if (typeof withdrawalDetail.amount === 'number') {
      formattedAmount = withdrawalDetail.amount.toFixed(2);
    } else if (typeof withdrawalDetail.amount === 'string') {
      formattedAmount = parseFloat(withdrawalDetail.amount).toFixed(2);
    } else {
      throw new Error(`无效的金额类型: ${typeof withdrawalDetail.amount}`);
    }
    const paymentData = {
      merchant: withdrawalDetail.merchantId,
      order_id: orderId,
      bank: withdrawalDetail.bank,
      total_amount: formattedAmount,
      bank_card_account: withdrawalDetail.account,
      bank_card_name: withdrawalDetail.accountName,
      bank_card_remark: 'no',
      callback_url: 'no',
    };
    
    // 调用支付API
    const response = await paymentUtil.callPaymentAPI({
      apiUrl,
      secret_key: withdrawalDetail.secretKey,
    }, paymentData);
    
    // 处理响应结果
    let transactionStatus = 'pending';
    let errorMessage = null;
    
    if (Number(response.status) === 1) {
      // 代付请求成功，但实际打款可能还在处理中
      transactionStatus = 'pending';
      logger.info(`订单 ${orderId} 代付请求成功，状态：${response.status || '处理中'}`);
    } else {
      // 代付请求失败
      transactionStatus = 'failed';
      let message = null;
      if(response.message) {
        try {
          message = JSON.stringify(response.message);
        } catch (e) {
          message = response.message;
        }
      }
      errorMessage = message || '代付请求失败';
      logger.error(`订单 ${orderId} 代付请求失败：${errorMessage}`);
    }
    
    // 更新交易记录
    await paymentTransactionModel.updateTransactionResult(orderId, {
      transactionStatus: transactionStatus,
      responseData: response,
      errorMessage: errorMessage,
      responseTime: new Date()
    });
    
    logger.info(`提现ID ${withdrawalDetail.id} 的第三方代付处理完成，状态: ${transactionStatus}`);
    
    // 如果交易失败，更新提现记录状态为失败
    if (transactionStatus === 'failed') {
      try {
        await transactionHandler.handleFailedTransaction(orderId, errorMessage || '第三方代付失败');
        logger.info(`提现ID ${withdrawalDetail.id} 状态已更新为失败，余额已退还`);
      } catch (error) {
        logger.error(`更新提现记录状态失败: ${error.message}`);
      }
    }
  } catch (error) {
    // 更新交易记录为失败状态
    try {
      await paymentTransactionModel.updateTransactionResult(orderId, {
        transactionStatus: 'failed',
        errorMessage: `API调用异常: ${error.message}`,
        responseTime: new Date()
      });
      
      // 同时更新提现记录为失败状态
      try {
        await transactionHandler.handleFailedTransaction(orderId, `API调用异常: ${error.message}`);
        logger.info(`提现ID ${withdrawalDetail.id} 状态已更新为失败，余额已退还`);
      } catch (updateError) {
        logger.error(`更新提现记录状态失败: ${updateError.message}`);
      }
    } catch (updateError) {
      logger.error(`更新交易记录失败: ${updateError.message}`);
    }
    
    logger.error(`提现ID ${withdrawalDetail.id} 的第三方代付处理异常: ${error.message}`);
    throw error;
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
    
    // 先查询提现状态并加排他锁(X锁)，防止并发问题
    const [pendingWithdrawals] = await connection.query(
      `SELECT 
        id, member_id, amount, bill_no
      FROM withdrawals 
      WHERE id IN (?) AND withdrawal_status = ?
      FOR UPDATE`,
      [ids, WithdrawalStatus.PENDING]
    );
    
    // 过滤出状态为pending的提现记录ID
    const pendingIds = pendingWithdrawals.map(withdrawal => withdrawal.id);
    
    if (pendingIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    const now = new Date();
    
    // 更新提现记录状态，只更新pending状态的记录
    const [result] = await connection.query(
      `UPDATE withdrawals 
       SET withdrawal_status = ?, reject_reason = ?, waiter_id = ?, process_time = ?, remark = ? 
       WHERE id IN (?) AND withdrawal_status = ?`,
      [WithdrawalStatus.FAILED, rejectReason, waiterId, now, remark, pendingIds, WithdrawalStatus.PENDING]
    );
    
    // 使用统一的余额退回服务
    const withdrawalRefundService = require('../services/withdrawal-refund.service');
    
    // 逐个处理每个提现记录的余额退回
    for (const withdrawal of pendingWithdrawals) {
      try {
        await withdrawalRefundService.refundWithdrawalBalance(
          withdrawal.bill_no, 
          `${rejectReason}`,
          connection
        );
      } catch (error) {
        logger.error(`退回提现余额失败: 提现ID=${withdrawal.id}, 账单=${withdrawal.bill_no}, 错误=${error.message}`);
        // 继续处理其他记录，不中断整个流程
      }
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
 * 检查会员是否有待处理的提现申请
 * @param {number} memberId - 会员ID
 * @returns {Promise<boolean>} - 是否有待处理的提现申请
 */
async function hasPendingWithdrawal(memberId) {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM withdrawals WHERE member_id = ? AND withdrawal_status = ?',
      [memberId, WithdrawalStatus.PENDING]
    );
    
    return result[0].count > 0;
  } catch (error) {
    logger.error(`检查会员待处理提现申请失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  formatWithdrawal,
  createWithdrawal,
  getWithdrawalsByMemberId,
  getAllWithdrawals,
  batchApproveWithdrawals,
  batchRejectWithdrawals,
  hasPendingWithdrawal
};