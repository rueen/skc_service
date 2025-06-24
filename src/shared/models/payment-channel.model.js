/**
 * 支付渠道模型
 * 处理支付渠道相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');
const { encrypt, decrypt, isEncrypted } = require('../utils/encryption.util');

/**
 * 格式化支付渠道信息
 * @param {Object} channel - 支付渠道信息
 * @param {boolean} includeSecretKey - 是否包含密钥信息
 * @returns {Object} 格式化后的支付渠道信息
 */
function formatPaymentChannel(channel, includeSecretKey = false) {
  if (!channel) return null;
  
  // 转换字段名称为驼峰命名法并格式化日期
  const formattedChannel = convertToCamelCase({
    ...channel,
    createTime: formatDateTime(channel.create_time),
    updateTime: formatDateTime(channel.update_time)
  });
  
  // 处理密钥
  if (includeSecretKey && formattedChannel.secretKey) {
    try {
      // 如果是加密的密钥，先解密
      if (isEncrypted(formattedChannel.secretKey)) {
        formattedChannel.secretKey = decrypt(formattedChannel.secretKey);
      }
    } catch (error) {
      logger.error(`解密支付渠道密钥失败: ${error.message}`);
      // 出错时删除密钥，避免泄露加密的数据
      delete formattedChannel.secretKey;
    }
  } else if (!includeSecretKey && formattedChannel.secretKey) {
    // 不需要包含密钥时删除
    delete formattedChannel.secretKey;
  }
  
  return formattedChannel;
}

/**
 * 获取支付渠道列表
 * @returns {Promise<Array>} 支付渠道列表
 */
async function getList() {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, bank, merchant_id, create_time, update_time 
       FROM payment_channels 
       ORDER BY create_time DESC`
    );
    
    return rows.map(row => formatPaymentChannel(row));
  } catch (error) {
    logger.error(`获取支付渠道列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取支付渠道
 * @param {number} id - 支付渠道ID
 * @param {boolean} includeSecretKey - 是否包含密钥信息
 * @returns {Promise<Object|null>} 支付渠道信息
 */
async function getById(id, includeSecretKey = false) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM payment_channels WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatPaymentChannel(rows[0], includeSecretKey);
  } catch (error) {
    logger.error(`根据ID获取支付渠道失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建支付渠道
 * @param {Object} channelData - 支付渠道数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(channelData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 准备插入数据
    const data = {
      name: channelData.name,
      bank: channelData.bank,
      merchant_id: channelData.merchantId
    };
    
    // 加密密钥
    if (channelData.secretKey) {
      try {
        data.secret_key = encrypt(channelData.secretKey);
      } catch (encryptError) {
        logger.error(`加密支付渠道密钥失败: ${encryptError.message}`);
        throw new Error('密钥加密失败，请确保加密配置正确');
      }
    }
    
    // 执行插入
    const [result] = await connection.query(
      'INSERT INTO payment_channels SET ?',
      [data]
    );
    
    // 获取新创建的支付渠道信息
    const [rows] = await connection.query(
      'SELECT * FROM payment_channels WHERE id = ?',
      [result.insertId]
    );
    
    await connection.commit();
    
    return formatPaymentChannel(rows[0]);
  } catch (error) {
    await connection.rollback();
    logger.error(`创建支付渠道失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新支付渠道
 * @param {Object} channelData - 支付渠道数据
 * @returns {Promise<boolean>} 更新结果
 */
async function update(channelData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查支付渠道是否存在
    const [existingChannel] = await connection.query(
      'SELECT id FROM payment_channels WHERE id = ?',
      [channelData.id]
    );
    
    if (existingChannel.length === 0) {
      throw new Error('支付渠道不存在');
    }
    
    // 准备更新数据
    const data = {
      name: channelData.name,
      bank: channelData.bank,
      merchant_id: channelData.merchantId
    };
    
    // 如果提供了secretKey，则加密后更新
    if (channelData.secretKey) {
      try {
        data.secret_key = encrypt(channelData.secretKey);
      } catch (encryptError) {
        logger.error(`加密支付渠道密钥失败: ${encryptError.message}`);
        throw new Error('密钥加密失败，请确保加密配置正确');
      }
    }
    
    // 执行更新
    const [result] = await connection.query(
      'UPDATE payment_channels SET ? WHERE id = ?',
      [data, channelData.id]
    );
    
    await connection.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新支付渠道失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除支付渠道
 * @param {number} id - 支付渠道ID
 * @returns {Promise<boolean>} 删除结果
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查支付渠道是否存在
    const [existingChannel] = await connection.query(
      'SELECT id FROM payment_channels WHERE id = ?',
      [id]
    );
    
    if (existingChannel.length === 0) {
      throw new Error('支付渠道不存在');
    }
    
    // 执行删除
    const [result] = await connection.query(
      'DELETE FROM payment_channels WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除支付渠道失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  formatPaymentChannel,
  getList,
  getById,
  create,
  update,
  remove
}; 