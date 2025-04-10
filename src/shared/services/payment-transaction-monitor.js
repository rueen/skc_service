/**
 * 支付交易监控任务
 * 处理超时的支付交易及状态更新
 */
const cron = require('node-cron');
const logger = require('../config/logger.config');
const paymentTransactionModel = require('../models/payment-transaction.model');
const paymentUtil = require('../utils/payment.util');
const paymentChannelModel = require('../models/payment-channel.model');

/**
 * 处理超时交易
 * 将超过30分钟未收到响应的交易标记为失败
 */
async function handleTimeoutTransactions() {
  try {
    logger.info('开始处理超时交易');
    const timeoutOrderIds = await paymentTransactionModel.markTimeoutTransactions(30);
    
    if (timeoutOrderIds.length > 0) {
      logger.info(`成功处理 ${timeoutOrderIds.length} 笔超时交易: ${timeoutOrderIds.join(', ')}`);
    } else {
      logger.info('没有需要处理的超时交易');
    }
  } catch (error) {
    logger.error(`处理超时交易失败: ${error.message}`);
  }
}

/**
 * 查询第三方支付交易状态
 * 查询处于pending状态的交易，更新其最新状态
 */
async function checkPendingTransactions() {
  try {
    logger.info('开始查询待处理交易状态');
    
    // 获取所有处于pending状态的交易
    const pendingTransactions = await paymentTransactionModel.getTransactions(
      { transactionStatus: 'pending' },
      1,
      100
    );
    
    if (pendingTransactions.total === 0) {
      logger.info('没有待处理的交易需要查询');
      return;
    }
    
    logger.info(`发现 ${pendingTransactions.total} 笔待处理交易，开始批量查询状态`);
    
    // 查询每笔交易的状态
    for (const transaction of pendingTransactions.list) {
      try {
        // 获取支付渠道信息
        const paymentChannel = await paymentChannelModel.getById(transaction.paymentChannelId, true);
        
        if (!paymentChannel) {
          logger.error(`交易 ${transaction.orderId} 的支付渠道不存在，无法查询状态`);
          continue;
        }
        
        // 查询API地址
        const apiUrl = process.env.PAYMENT_QUERY_API_URL;
        
        // 调用查询API
        const response = await paymentUtil.callPaymentAPI({
          merchant: paymentChannel.merchantId,
          secret_key: paymentChannel.secretKey,
          order_id: transaction.orderId,
          bank: paymentChannel.bank,
          total_amount: transaction.amount,
          bank_card_account: transaction.account,
          bank_card_name: transaction.accountName,
          apiUrl: apiUrl,
        });
        
        let transactionStatus = transaction.transactionStatus;
        let errorMessage = null;
        
        if (response.code === '0' || response.code === 0) {
          // 根据返回的状态更新交易状态
          if (response.status === 'success' || response.status === '1') {
            transactionStatus = 'success';
            logger.info(`交易 ${transaction.orderId} 成功完成`);
          } else if (response.status === 'failed' || response.status === '2') {
            transactionStatus = 'failed';
            errorMessage = response.message || '代付失败';
            logger.warn(`交易 ${transaction.orderId} 失败: ${errorMessage}`);
          } else {
            // 状态仍在处理中
            logger.info(`交易 ${transaction.orderId} 仍在处理中`);
          }
        } else {
          // 查询失败，更新为失败状态
          transactionStatus = 'failed';
          errorMessage = response.message || '代付查询失败';
          logger.warn(`交易 ${transaction.orderId} 查询失败: ${response.message}，状态更新为失败`);
        }
        
        // 如果状态有变化或查询失败，更新交易记录
        if (transactionStatus !== transaction.transactionStatus || response.code !== '0') {
          await paymentTransactionModel.updateTransactionResult(transaction.orderId, {
            transactionStatus: transactionStatus,
            responseData: response,
            errorMessage: errorMessage,
            responseTime: new Date()
          });
        }
      } catch (error) {
        logger.error(`查询交易 ${transaction.orderId} 状态失败: ${error.message}`);
      }
    }
    
    logger.info('待处理交易状态查询完成');
  } catch (error) {
    logger.error(`查询待处理交易状态失败: ${error.message}`);
  }
}

/**
 * 手动重试单个交易
 * @param {string} orderId - 订单ID
 * @returns {Promise<Object>} 更新后的交易状态
 */
async function retryTransaction(orderId) {
  try {
    logger.info(`开始手动重试交易：${orderId}`);
    
    // 获取交易记录
    const transaction = await paymentTransactionModel.getTransactionByOrderId(orderId);
    if (!transaction) {
      throw new Error(`交易 ${orderId} 不存在`);
    }
    
    // 获取支付渠道信息
    const paymentChannel = await paymentChannelModel.getById(transaction.paymentChannelId, true);
    if (!paymentChannel) {
      throw new Error(`交易 ${orderId} 的支付渠道不存在，无法查询状态`);
    }
    
    // 查询API地址
    const apiUrl = process.env.PAYMENT_QUERY_API_URL;
    
    // 调用查询API
    const response = await paymentUtil.callPaymentAPI({
      merchant: paymentChannel.merchantId,
      secret_key: paymentChannel.secretKey,
      order_id: transaction.orderId,
      bank: paymentChannel.bank,
      total_amount: transaction.amount,
      bank_card_account: transaction.account,
      bank_card_name: transaction.accountName,
      apiUrl: apiUrl,
    });
    
    let transactionStatus = 'pending'; // 默认保持为pending
    let errorMessage = null;
    
    if (response.code === '0' || response.code === 0) {
      // 根据返回的状态更新交易状态
      if (response.status === 'success' || response.status === '1') {
        transactionStatus = 'success';
        logger.info(`交易 ${transaction.orderId} 成功完成`);
      } else if (response.status === 'failed' || response.status === '2') {
        transactionStatus = 'failed';
        errorMessage = response.message || '代付失败';
        logger.warn(`交易 ${transaction.orderId} 失败: ${errorMessage}`);
      } else {
        // 状态仍在处理中，保持pending
        logger.info(`交易 ${transaction.orderId} 仍在处理中`);
      }
    } else {
      // 查询失败，标记为失败
      transactionStatus = 'failed';
      errorMessage = response.message || '代付查询失败';
      logger.warn(`交易 ${transaction.orderId} 查询失败: ${response.message}，标记为失败`);
    }
    
    // 更新交易记录
    await paymentTransactionModel.updateTransactionResult(transaction.orderId, {
      transactionStatus: transactionStatus,
      responseData: response,
      errorMessage: errorMessage,
      responseTime: new Date()
    });
    
    // 如果交易失败，尝试更新提现记录状态
    if (transactionStatus === 'failed' && transaction.withdrawalId) {
      try {
        // 获取提现记录
        const withdrawalModel = require('../models/withdrawal.model');
        const { pool } = require('../models/db');
        const { WithdrawalStatus, BillType } = require('../config/enums');
        const memberModel = require('../models/member.model');
        
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          
          // 查询提现记录
          const [withdrawalRecords] = await connection.query(
            'SELECT * FROM withdrawals WHERE id = ? AND withdrawal_status = ?',
            [transaction.withdrawalId, 'processing']
          );
          
          if (withdrawalRecords.length > 0) {
            const withdrawal = withdrawalRecords[0];
            
            // 更新提现记录状态
            await connection.query(
              `UPDATE withdrawals 
               SET withdrawal_status = ?, reject_reason = ? 
               WHERE id = ? AND withdrawal_status = ?`,
              [WithdrawalStatus.FAILED, errorMessage || '第三方代付失败', withdrawal.id, 'processing']
            );
            
            // 退还余额
            await memberModel.updateMemberBalance(withdrawal.member_id, withdrawal.amount);
            
            // 更新账单状态
            await connection.query(
              `UPDATE bills 
               SET withdrawal_status = ?, failure_reason = ? 
               WHERE member_id = ? AND bill_type = ? AND amount = ?`,
              [WithdrawalStatus.FAILED, errorMessage || '第三方代付失败', withdrawal.member_id, BillType.WITHDRAWAL, -withdrawal.amount]
            );
            
            await connection.commit();
            logger.info(`提现ID ${withdrawal.id} 状态已更新为失败，余额已退还`);
          }
        } catch (error) {
          await connection.rollback();
          logger.error(`更新提现记录状态失败: ${error.message}`);
        } finally {
          connection.release();
        }
      } catch (error) {
        logger.error(`尝试更新提现记录状态时出错: ${error.message}`);
      }
    }
    
    logger.info(`交易 ${orderId} 手动重试完成，最终状态: ${transactionStatus}`);
    return { orderId, status: transactionStatus, message: errorMessage };
  } catch (error) {
    logger.error(`手动重试交易 ${orderId} 失败: ${error.message}`);
    
    // 更新交易为失败状态
    await paymentTransactionModel.updateTransactionResult(orderId, {
      transactionStatus: 'failed',
      errorMessage: `重试失败: ${error.message}`,
      responseTime: new Date()
    });
    
    throw error;
  }
}

/**
 * 初始化定时任务
 */
function initTasks() {
  // 每10分钟处理一次超时交易
  cron.schedule('*/10 * * * *', async () => {
    await handleTimeoutTransactions();
  });
  
  // 每5分钟查询一次待处理交易状态
  cron.schedule('*/5 * * * *', async () => {
    await checkPendingTransactions();
  });
  
  logger.info('支付交易监控任务已启动');
}

module.exports = {
  initTasks,
  handleTimeoutTransactions,
  checkPendingTransactions,
  retryTransaction
}; 