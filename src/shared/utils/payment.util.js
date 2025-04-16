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
 * 1. 参数名ASCII码从小到大排序（字典序）
 * 2. 参数名区分大小写
 * 3. 排除空值参数和sign参数
 * 4. 最后拼接key={secretKey}
 * 5. 对拼接字符串进行MD5计算
 * @param {Object} params - 请求参数
 * @param {string} secretKey - 密钥
 * @returns {string} - 签名值
 */
function generateSignature(data, secretKey) {
  try {
    // 过滤掉空值参数和sign参数
    const filteredData = {};
    for (const key in data) {
      if (key !== 'sign' && data[key] !== undefined && data[key] !== null && data[key] !== '') {
        // 确保数字值不会转换为科学计数法
        if (typeof data[key] === 'number') {
          filteredData[key] = data[key].toString();
        } else {
          filteredData[key] = data[key];
        }
      }
    }
    
    // 按照ASCII码从小到大排序（字典序）
    const sortedKeys = Object.keys(filteredData).sort();
    
    // 构建签名字符串：key1=value1&key2=value2&...
    let signStr = '';
    for (const key of sortedKeys) {
      signStr += `${key}=${filteredData[key]}&`;
    }
    
    // 添加密钥
    signStr += `key=${secretKey}`;
    
    // 使用MD5进行加密
    return crypto.MD5(signStr).toString();
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
 * @param {string} paymentData.merchant - 渠道商户ID
 * @param {string} paymentData.secret_key - 渠道密钥
 * @param {string} paymentData.order_id - 订单号
 * @param {string} paymentData.bank - 银行
 * @param {number} paymentData.total_amount - 金额
 * @param {string} paymentData.bank_card_account - 收款账号
 * @param {string} paymentData.bank_card_name - 收款人姓名
 * @param {string} baseData.apiUrl - 支付API地址
 * @param {string} baseData.secret_key - 支付API密钥
 * @returns {Promise<Object>} - API响应结果
 */
async function callPaymentAPI(baseData, paymentData) {
  try {
    const { apiUrl, secret_key } = baseData;
    const { order_id } = paymentData;
    
    // 构造请求参数
    const params = {
      ...paymentData
    };
    
    // 生成签名并添加到参数中
    params.sign = generateSignature(params, secret_key);
    
    if(order_id){
      logger.info(`开始调用第三方支付API，订单号: ${order_id}`);
    }
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

module.exports = {
  generateSignature,
  generateOrderId,
  callPaymentAPI
}; 