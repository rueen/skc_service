/**
 * 支付工具函数
 * 处理第三方支付API相关操作
 */
const axios = require('axios');
const crypto = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger.config');

/**
 * 生成第三方支付API签名
 * @param {Object} params - 请求参数
 * @param {string} secretKey - 密钥
 * @returns {string} - 签名值
 */
function generateSignature(params, secretKey) {
  try {
    // 按键名ASCII码从小到大排序
    const sortedKeys = Object.keys(params).sort();
    
    // 构建待签名字符串
    let signStr = '';
    for (const key of sortedKeys) {
      // 跳过sign字段
      if (key !== 'sign' && params[key] !== undefined && params[key] !== null && params[key] !== '') {
        signStr += `${key}=${params[key]}&`;
      }
    }
    
    // 添加密钥
    signStr += `key=${secretKey}`;
    
    // 生成签名
    const sign = crypto.MD5(signStr).toString().toUpperCase();
    
    logger.debug(`签名字符串: ${signStr}`);
    logger.debug(`生成的签名: ${sign}`);
    
    return sign;
  } catch (error) {
    logger.error(`生成签名失败: ${error.message}`);
    throw error;
  }
}

/**
 * 生成唯一订单号
 * @returns {string} - 唯一订单号
 */
function generateOrderId() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2); // 年份后两位
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');
  
  // 使用年月日时分秒+UUID前6位生成订单号
  const uuid = uuidv4().replace(/-/g, '').slice(0, 6);
  
  return `${year}${month}${day}${hour}${minute}${second}${uuid}`;
}

/**
 * 调用第三方代付API
 * @param {Object} paymentData - 支付数据
 * @param {string} paymentData.channelMerchantId - 渠道商户ID
 * @param {string} paymentData.channelSecretKey - 渠道密钥
 * @param {string} paymentData.apiUrl - API地址
 * @param {string} paymentData.account - 收款账号
 * @param {string} paymentData.accountName - 收款人姓名
 * @param {number} paymentData.amount - 金额
 * @param {string} paymentData.orderId - 订单号
 * @returns {Promise<Object>} - API响应结果
 */
async function callPaymentAPI(paymentData) {
  try {
    const {
      channelMerchantId,
      channelSecretKey,
      apiUrl,
      account,
      accountName,
      amount,
      orderId
    } = paymentData;
    
    // 构造请求参数
    const params = {
      merchant_id: channelMerchantId,
      order_id: orderId,
      amount: amount.toFixed(2),
      callback_url: 'no',
      account: account,
      account_name: accountName,
      notify_url: 'no'
    };
    
    // 生成签名并添加到参数中
    params.sign = generateSignature(params, channelSecretKey);
    
    logger.info(`开始调用第三方支付API，订单号: ${orderId}`);
    logger.debug(`支付API请求参数: ${JSON.stringify(params)}`);
    
    // 发起POST请求
    const response = await axios.post(apiUrl, params, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });
    
    logger.debug(`支付API响应: ${JSON.stringify(response.data)}`);
    
    return response.data;
  } catch (error) {
    if (error.response) {
      // 服务器返回了错误状态码
      logger.error(`支付API调用失败, 状态码: ${error.response.status}, 响应: ${JSON.stringify(error.response.data)}`);
      throw new Error(`支付API调用失败: ${error.response.status} ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      logger.error(`支付API无响应: ${error.message}`);
      throw new Error(`支付API无响应: ${error.message}`);
    } else {
      // 请求设置时出错
      logger.error(`支付API请求配置错误: ${error.message}`);
      throw new Error(`支付API请求配置错误: ${error.message}`);
    }
  }
}

/**
 * 验证API响应签名
 * @param {Object} responseData - API响应数据
 * @param {string} secretKey - 密钥
 * @returns {boolean} - 签名是否有效
 */
function verifySignature(responseData, secretKey) {
  try {
    if (!responseData || !responseData.sign) {
      return false;
    }
    
    const receivedSign = responseData.sign;
    const calculatedSign = generateSignature(responseData, secretKey);
    
    return receivedSign === calculatedSign;
  } catch (error) {
    logger.error(`验证响应签名失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  generateSignature,
  generateOrderId,
  callPaymentAPI,
  verifySignature
}; 