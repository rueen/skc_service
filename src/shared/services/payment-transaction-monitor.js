/**
 * 支付交易监控任务
 * 处理超时的支付交易及状态更新
 */
const cron = require('node-cron');
const logger = require('../config/logger.config');
const paymentTransactionModel = require('../models/payment-transaction.model');
const paymentUtil = require('../utils/payment.util');
const paymentChannelModel = require('../models/payment-channel.model');
const transactionHandler = require('./transaction-handler.service');

/**
 * 查询第三方支付交易状态
 * 查询处于pending状态的交易，更新其最新状态
 */
async function checkPendingTransactions() {
  // 使用简单的文件标志作为分布式锁
  const fs = require('fs');
  const path = require('path');
  const { pool } = require('../models/db');
  const lockFile = path.join(process.cwd(), 'transaction_monitor.lock');
  
  // 检查锁是否存在
  try {
    if (fs.existsSync(lockFile)) {
      const stats = fs.statSync(lockFile);
      const fileAge = Date.now() - stats.mtimeMs;
      
      // 如果锁文件存在且创建时间不超过10分钟，说明有其他进程正在处理
      if (fileAge < 10 * 60 * 1000) {
        logger.info('另一个进程正在处理交易状态查询，跳过本次执行');
        return;
      } else {
        // 锁文件过期，可以删除
        logger.warn('发现过期的锁文件，可能上次执行异常终止，删除锁文件并继续执行');
        fs.unlinkSync(lockFile);
      }
    }
    
    // 创建锁文件
    fs.writeFileSync(lockFile, String(Date.now()));
    
    logger.info('开始查询待处理交易状态');
    
    // 获取所有处于pending状态的交易
    const pendingTransactions = await paymentTransactionModel.getTransactions(
      { transactionStatus: 'pending' },
      1,
      100
    );
    
    if (pendingTransactions.total === 0) {
      logger.info('没有待处理的交易需要查询');
      // 确保在提前返回时释放锁文件
      try {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
        }
      } catch (unlinkError) {
        logger.error(`删除锁文件失败: ${unlinkError.message}`);
      }
      return;
    }
    
    logger.info(`发现 ${pendingTransactions.total} 笔待处理交易，开始批量查询状态`);
    
    // 查询每笔交易的状态
    for (const transaction of pendingTransactions.list) {
      let connection = null;
      try {
        // 为每个交易创建独立的数据库连接和事务
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // 使用排他锁查询交易记录，防止并发问题
        const [lockedTransactions] = await connection.query(
          `SELECT * FROM payment_transactions 
           WHERE order_id = ? AND transaction_status = 'pending'
           FOR UPDATE`,
          [transaction.orderId]
        );
        
        // 如果交易不存在或状态已变更，则跳过处理
        if (lockedTransactions.length === 0) {
          logger.info(`交易 ${transaction.orderId} 不存在或状态已变更，跳过处理`);
          await connection.commit();
          continue;
        }
        
        const lockedTransaction = lockedTransactions[0];
        
        // 获取支付渠道信息 - 使用lockedTransaction
        const paymentChannel = await paymentChannelModel.getById(lockedTransaction.payment_channel_id, true);
        
        if (!paymentChannel) {
          logger.error(`交易 ${lockedTransaction.order_id} 的支付渠道不存在，无法查询状态`);
          await connection.commit();
          continue;
        }
        
        // 查询API地址
        const apiUrl = process.env.PAYMENT_QUERY_API_URL;
        
        // 调用查询API - 使用lockedTransaction
        const paymentData = {
          merchant: paymentChannel.merchantId,
          order_id: lockedTransaction.order_id,
        }
        const response = await paymentUtil.callPaymentAPI({
          apiUrl,
          secret_key: paymentChannel.secretKey,
        }, paymentData);
        
        // 使用lockedTransaction中的状态
        let transactionStatus = lockedTransaction.transaction_status;
        let errorMessage = null;
        
        // 交易狀態：0-错误 1-等待中，2,6,10-进行中，3-失败，5-成功
        if (Number(response.status) === 5) {
          transactionStatus = 'success';
          logger.info(`交易 ${lockedTransaction.order_id} 成功完成`);
        } else if ([0, 3].indexOf(Number(response.status)) > -1) {
          transactionStatus = 'failed';
          errorMessage = response.message || '代付失败';
          logger.warn(`交易 ${lockedTransaction.order_id} 失败: ${errorMessage}`);
        } else {
          // 状态仍在处理中
          logger.info(`交易 ${lockedTransaction.order_id} 仍在处理中`);
        }
        
        // 只有当交易状态真正发生变化时才更新交易记录和处理相关业务
        if (transactionStatus !== 'pending') {
          logger.info(`交易 ${lockedTransaction.order_id} 状态从 pending 变更为 ${transactionStatus}`);
          
          // 直接在事务中更新交易记录
          await connection.query(
            `UPDATE payment_transactions 
             SET transaction_status = ?, 
                 response_data = ?,
                 error_message = ?,
                 response_time = NOW()
             WHERE order_id = ? AND transaction_status = 'pending'`,
            [
              transactionStatus, 
              JSON.stringify(response), 
              errorMessage, 
              lockedTransaction.order_id
            ]
          );
          
          // 提交当前事务
          await connection.commit();
          
          // 根据交易状态，更新提现记录和账单状态，处理余额
          // 这些操作会在自己的事务中进行
          if (transactionStatus === 'success') {
            // 处理成功交易
            await transactionHandler.handleSuccessTransaction(lockedTransaction.order_id);
          } else if (transactionStatus === 'failed') {
            // 处理失败交易
            await transactionHandler.handleFailedTransaction(lockedTransaction.order_id, errorMessage || '交易失败');
          }
        } else {
          logger.info(`交易 ${lockedTransaction.order_id} 状态未变化，仍为 pending`);
          await connection.commit();
        }
      } catch (error) {
        if (connection) {
          await connection.rollback();
        }
        logger.error(`查询交易 ${transaction.orderId} 状态失败: ${error.message}`);
      } finally {
        // 确保无论如何都释放连接
        if (connection) {
          connection.release();
        }
      }
    }
    
    logger.info('待处理交易状态查询完成');
  } catch (error) {
    logger.error(`查询待处理交易状态失败: ${error.message}`);
  } finally {
    // 清理锁文件
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (unlinkError) {
      logger.error(`删除锁文件失败: ${unlinkError.message}`);
    }
  }
}

/**
 * 初始化定时任务
 */
function initTasks() {
  // 每5分钟查询一次待处理交易状态
  cron.schedule('*/5 * * * *', async () => {
    await checkPendingTransactions();
  });
  
  logger.info('支付交易监控任务已启动');
}

module.exports = {
  initTasks,
  checkPendingTransactions
}; 