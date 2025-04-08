/**
 * 支付交易记录模型
 * 处理支付交易相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化支付交易记录
 * @param {Object} transaction - 支付交易记录
 * @returns {Object} 格式化后的支付交易记录
 */
function formatPaymentTransaction(transaction) {
  if (!transaction) return null;

  // 转换字段名称为驼峰命名法
  try {
    let requestParams = null;
    let responseData = null;
    
    if (transaction.request_params) {
      try {
        requestParams = JSON.parse(transaction.request_params);
      } catch (e) {
        requestParams = transaction.request_params; // 保留原始字符串
      }
    }
    
    if (transaction.response_data) {
      try {
        responseData = JSON.parse(transaction.response_data);
      } catch (e) {
        responseData = transaction.response_data; // 保留原始字符串
      }
    }
    
    const formattedTransaction = convertToCamelCase({
      ...transaction,
      requestParams: requestParams,
      responseData: responseData,
      requestTime: formatDateTime(transaction.request_time),
      responseTime: formatDateTime(transaction.response_time),
      createTime: formatDateTime(transaction.create_time),
      updateTime: formatDateTime(transaction.update_time)
    });

    return formattedTransaction;
  } catch (error) {
    logger.error(`格式化交易记录失败: ${error.message}`);
    // 返回一个基本的格式化记录，不包含可能导致错误的JSON字段
    return {
      id: transaction.id,
      orderId: transaction.order_id,
      withdrawalId: transaction.withdrawal_id,
      memberId: transaction.member_id,
      amount: transaction.amount,
      transactionStatus: transaction.transaction_status,
      createTime: formatDateTime(transaction.create_time),
      requestTime: formatDateTime(transaction.request_time),
      responseTime: formatDateTime(transaction.response_time)
    };
  }
}

/**
 * 创建支付交易记录
 * @param {Object} transactionData - 交易数据
 * @returns {Promise<Object>} 创建的交易记录
 */
async function createTransaction(transactionData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const now = new Date();
    
    // 确保amount是数字类型
    let formattedAmount;
    if (typeof transactionData.amount === 'number') {
      formattedAmount = transactionData.amount.toFixed(2);
    } else if (typeof transactionData.amount === 'string') {
      formattedAmount = parseFloat(transactionData.amount).toFixed(2);
    } else {
      throw new Error(`无效的金额类型: ${typeof transactionData.amount}`);
    }

    // 准备插入数据
    const data = {
      order_id: transactionData.orderId,
      withdrawal_id: transactionData.withdrawalId,
      member_id: transactionData.memberId,
      payment_channel_id: transactionData.paymentChannelId,
      amount: formattedAmount,
      account: transactionData.account,
      account_name: transactionData.accountName,
      transaction_status: transactionData.transactionStatus || 'pending',
      request_params: transactionData.requestParams ? JSON.stringify(transactionData.requestParams) : null,
      request_time: transactionData.requestTime || now
    };

    // 执行插入
    const [result] = await connection.query(
      'INSERT INTO payment_transactions SET ?',
      [data]
    );

    await connection.commit();

    // 获取新创建的交易记录
    const [transactions] = await connection.query(
      'SELECT * FROM payment_transactions WHERE id = ?',
      [result.insertId]
    );

    return formatPaymentTransaction(transactions[0]);
  } catch (error) {
    await connection.rollback();
    logger.error(`创建支付交易记录失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新交易记录状态和响应数据
 * @param {string} orderId - 订单号
 * @param {Object} updateData - 更新数据
 * @returns {Promise<boolean>} 更新结果
 */
async function updateTransactionResult(orderId, updateData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const now = new Date();
    
    // 确保responseData是JSON字符串
    let responseDataStr = null;
    if (updateData.responseData) {
      if (typeof updateData.responseData === 'string') {
        responseDataStr = updateData.responseData;
      } else {
        responseDataStr = JSON.stringify(updateData.responseData);
      }
    }
    
    // 准备更新数据
    const data = {
      transaction_status: updateData.transactionStatus,
      response_data: responseDataStr,
      error_message: updateData.errorMessage,
      response_time: updateData.responseTime || now,
      update_time: now
    };

    // 执行更新
    const [result] = await connection.query(
      'UPDATE payment_transactions SET ? WHERE order_id = ?',
      [data, orderId]
    );

    await connection.commit();

    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新支付交易记录失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 根据订单号获取交易记录
 * @param {string} orderId - 订单号
 * @returns {Promise<Object|null>} 交易记录
 */
async function getTransactionByOrderId(orderId) {
  try {
    const [transactions] = await pool.query(
      'SELECT * FROM payment_transactions WHERE order_id = ?',
      [orderId]
    );

    if (transactions.length === 0) {
      return null;
    }

    return formatPaymentTransaction(transactions[0]);
  } catch (error) {
    logger.error(`根据订单号获取交易记录失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有交易记录
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 分页交易记录列表
 */
async function getTransactions(filters = {}, page = 1, pageSize = 10) {
  try {
    let baseQuery = `
      SELECT pt.*, 
             m.nickname as member_nickname,
             pc.name as payment_channel_name,
             w.amount as withdrawal_amount
      FROM payment_transactions pt
      LEFT JOIN members m ON pt.member_id = m.id
      LEFT JOIN payment_channels pc ON pt.payment_channel_id = pc.id
      LEFT JOIN withdrawals w ON pt.withdrawal_id = w.id
    `;
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_transactions pt
    `;
    
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.memberId) {
      conditions.push('pt.member_id = ?');
      queryParams.push(filters.memberId);
    }
    
    if (filters.transactionStatus) {
      conditions.push('pt.transaction_status = ?');
      queryParams.push(filters.transactionStatus);
    }
    
    if (filters.orderId) {
      conditions.push('pt.order_id LIKE ?');
      queryParams.push(`%${filters.orderId}%`);
    }
    
    if (filters.withdrawalId) {
      conditions.push('pt.withdrawal_id = ?');
      queryParams.push(filters.withdrawalId);
    }
    
    // 日期范围过滤
    if (filters.startDate) {
      conditions.push('pt.create_time >= ?');
      queryParams.push(`${filters.startDate} 00:00:00`);
    }
    
    if (filters.endDate) {
      conditions.push('pt.create_time <= ?');
      queryParams.push(`${filters.endDate} 23:59:59`);
    }

    // 组合查询条件
    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    // 获取总记录数
    const [countResult] = await pool.query(countQuery + whereClause, queryParams);
    const total = countResult[0].total;

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 执行分页查询
    const [transactions] = await pool.query(
      baseQuery + whereClause + ' ORDER BY pt.create_time DESC LIMIT ?, ?',
      [...queryParams, offset, parseInt(pageSize)]
    );

    // 格式化交易记录
    const formattedTransactions = transactions.map(formatPaymentTransaction);

    return {
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      list: formattedTransactions
    };
  } catch (error) {
    logger.error(`获取交易记录列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量更新失败交易的状态
 * 用于定时任务重试处理超时未完成的交易
 * @param {number} timeoutMinutes - 超时时间（分钟）
 * @returns {Promise<Array>} 更新的交易ID列表
 */
async function markTimeoutTransactions(timeoutMinutes = 30) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 找出所有状态为pending但请求时间超过指定时间的交易
    const timeout = new Date();
    timeout.setMinutes(timeout.getMinutes() - timeoutMinutes);

    const [pendingTransactions] = await connection.query(
      `SELECT id, order_id FROM payment_transactions 
       WHERE transaction_status = 'pending' 
       AND request_time < ? 
       AND response_time IS NULL`,
      [timeout]
    );

    if (pendingTransactions.length === 0) {
      await connection.commit();
      return [];
    }

    // 批量更新这些交易的状态为失败
    const transactionIds = pendingTransactions.map(t => t.id);
    await connection.query(
      `UPDATE payment_transactions 
       SET transaction_status = 'failed', 
           error_message = '交易超时', 
           response_time = NOW() 
       WHERE id IN (?)`,
      [transactionIds]
    );

    await connection.commit();

    return pendingTransactions.map(t => t.order_id);
  } catch (error) {
    await connection.rollback();
    logger.error(`标记超时交易失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  formatPaymentTransaction,
  createTransaction,
  updateTransactionResult,
  getTransactionByOrderId,
  getTransactions,
  markTimeoutTransactions
}; 