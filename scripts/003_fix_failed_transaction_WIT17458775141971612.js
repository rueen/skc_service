/*
 * @Author: diaochan
 * @Date: 2025-07-11 16:06:26
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-11 16:29:35
 * @Description: 
 */
/**
 * 修复失败交易的迁移脚本
 * 处理订单号 WIT17458775141971612 的失败交易
 * 更新提现记录、账单状态并退还余额
 */

// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const path = require('path');
const { pool } = require('../src/shared/models/db');
const { logger } = require('../src/shared/config/logger.config');
const transactionHandlerService = require('../src/shared/services/transaction-handler.service');

async function fixFailedTransaction() {
  const orderId = 'WIT17458775141971612';
  
  console.log(`开始处理失败交易: ${orderId}`);
  
  try {
    // 1. 首先查询当前状态
    console.log('查询当前交易状态...');
    
    const [transactions] = await pool.query(
      'SELECT * FROM payment_transactions WHERE order_id = ?',
      [orderId]
    );
    
    if (transactions.length === 0) {
      console.error(`找不到订单 ${orderId} 的交易记录`);
      return false;
    }
    
    const transaction = transactions[0];
    console.log(`交易状态: ${transaction.transaction_status}`);
    console.log(`错误信息: ${transaction.error_message}`);
    
    // 2. 查询提现记录状态
    const [withdrawals] = await pool.query(
      'SELECT * FROM withdrawals WHERE id = ?',
      [transaction.withdrawal_id]
    );
    
    if (withdrawals.length === 0) {
      console.error(`找不到提现记录 ${transaction.withdrawal_id}`);
      return false;
    }
    
    const withdrawal = withdrawals[0];
    console.log(`提现状态: ${withdrawal.withdrawal_status}`);
    
    // 3. 查询账单记录状态
    const [bills] = await pool.query(
      'SELECT * FROM bills WHERE bill_no = ? AND bill_type = "withdrawal"',
      [orderId]
    );
    
    if (bills.length === 0) {
      console.error(`找不到账单记录 ${orderId}`);
      return false;
    }
    
    const bill = bills[0];
    console.log(`账单结算状态: ${bill.settlement_status}`);
    console.log(`账单提现状态: ${bill.withdrawal_status}`);
    
    // 4. 检查是否需要处理
    if (transaction.transaction_status !== 'failed') {
      console.log(`交易状态不是失败状态 (${transaction.transaction_status})，跳过处理`);
      return true;
    }
    
    if (withdrawal.withdrawal_status === 'failed') {
      console.log('提现记录已经是失败状态，跳过处理');
      return true;
    }
    
    // 5. 使用交易处理服务处理失败交易
    console.log('开始处理失败交易...');
    const result = await transactionHandlerService.handleFailedTransaction(
      orderId,
      transaction.error_message || '第三方支付失败'
    );
    
    if (result) {
      console.log(`✅ 成功处理失败交易 ${orderId}`);
      
      // 验证处理结果
      console.log('验证处理结果...');
      
      const [updatedWithdrawal] = await pool.query(
        'SELECT withdrawal_status, reject_reason FROM withdrawals WHERE id = ?',
        [transaction.withdrawal_id]
      );
      
      const [updatedBill] = await pool.query(
        'SELECT settlement_status, withdrawal_status, failure_reason FROM bills WHERE bill_no = ?',
        [orderId]
      );
      
      const [updatedTransaction] = await pool.query(
        'SELECT transaction_status FROM payment_transactions WHERE order_id = ?',
        [orderId]
      );
      
      console.log('处理后状态:');
      console.log(`- 提现状态: ${updatedWithdrawal[0]?.withdrawal_status}`);
      console.log(`- 提现拒绝原因: ${updatedWithdrawal[0]?.reject_reason}`);
      console.log(`- 账单结算状态: ${updatedBill[0]?.settlement_status}`);
      console.log(`- 账单提现状态: ${updatedBill[0]?.withdrawal_status}`);
      console.log(`- 账单失败原因: ${updatedBill[0]?.failure_reason}`);
      console.log(`- 交易状态: ${updatedTransaction[0]?.transaction_status}`);
      
      return true;
    } else {
      console.error(`❌ 处理失败交易 ${orderId} 失败`);
      return false;
    }
    
  } catch (error) {
    console.error(`处理失败交易时出错: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

// 主执行函数
async function main() {
  console.log('=== 失败交易修复脚本开始 ===');
  console.log(`执行时间: ${new Date().toISOString()}`);
  
  try {
    const success = await fixFailedTransaction();
    
    if (success) {
      console.log('=== 失败交易修复脚本执行成功 ===');
      process.exit(0);
    } else {
      console.error('=== 失败交易修复脚本执行失败 ===');
      process.exit(1);
    }
  } catch (error) {
    console.error(`脚本执行出错: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // 确保关闭数据库连接池
    if (pool && pool.end) {
      await pool.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { fixFailedTransaction }; 