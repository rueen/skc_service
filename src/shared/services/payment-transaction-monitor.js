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
        const paymentData = {
          merchant: paymentChannel.merchantId,
          order_id: transaction.orderId,
        }
        const response = await paymentUtil.callPaymentAPI({
          apiUrl,
          secret_key: paymentChannel.secretKey,
        }, paymentData);
        
        let transactionStatus = transaction.transactionStatus;
        let errorMessage = null;
        
        // 交易狀態：0-错误 1-等待中，2,6,10-进行中，3-失败，5-成功
        if (Number(response.status) === 5) {
          transactionStatus = 'success';
          logger.info(`交易 ${transaction.orderId} 成功完成`);
        } else if ([0, 3].indexOf(Number(response.status)) > -1) {
          transactionStatus = 'failed';
          errorMessage = response.message || '代付失败';
          logger.warn(`交易 ${transaction.orderId} 失败: ${errorMessage}`);
        } else {
          // 状态仍在处理中
          logger.info(`交易 ${transaction.orderId} 仍在处理中`);
        }
        
        // 如果状态有变化或查询失败，更新交易记录
        if (transactionStatus !== transaction.transactionStatus || Number(response.status) !== 1) {
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
  checkPendingTransactions
}; 