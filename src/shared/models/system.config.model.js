/**
 * 系统配置模型
 * 处理系统配置相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');

function formatConfig(config) {
  if (!config) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedConfig = convertToCamelCase({
    ...config,
    createTime: formatDateTime(config.create_time),
    updateTime: formatDateTime(config.update_time)
  });
  return formattedConfig;
}

/**
 * 获取所有系统配置
 * @returns {Promise<Array>} 配置列表
 */
async function getAllConfigs() {
  try {
    const [rows] = await pool.query('SELECT * FROM system_config ORDER BY config_key');
    
    return rows.map(config => formatConfig(config));
  } catch (error) {
    logger.error(`获取所有系统配置失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据键获取配置
 * @param {string} key - 配置键
 * @returns {Promise<Object|null>} 配置信息或null
 */
async function getConfigByKey(key) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM system_config WHERE config_key = ?',
      [key]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatConfig(rows[0]);
  } catch (error) {
    logger.error(`根据键获取配置失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新配置
 * @param {string} key - 配置键
 * @param {string} value - 配置值
 * @param {string} description - 配置描述（可选）
 * @returns {Promise<boolean>} 是否更新成功
 */
async function updateConfig(key, value, description) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查配置是否存在
    const [existingConfig] = await connection.query(
      'SELECT id FROM system_config WHERE config_key = ?',
      [key]
    );
    
    let result;
    if (existingConfig.length > 0) {
      // 更新配置
      if (description !== undefined) {
        // 如果提供了描述，一起更新
        [result] = await connection.query(
          'UPDATE system_config SET config_value = ?, description = ? WHERE config_key = ?',
          [value, description, key]
        );
      } else {
        // 只更新值
        [result] = await connection.query(
          'UPDATE system_config SET config_value = ? WHERE config_key = ?',
          [value, key]
        );
      }
    } else {
      // 插入新配置
      [result] = await connection.query(
        'INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)',
        [key, value, description || null]
      );
    }
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新配置失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取系统配置的最大群成员数
 * @returns {Promise<number>} 最大群成员数
 */
async function getMaxGroupMembers() {
  try {
    const config = await getConfigByKey('max_group_members');
    return config ? parseInt(config.value, 10) : 200; // 默认200
  } catch (error) {
    logger.error(`获取最大群成员数失败: ${error.message}`);
    return 200; // 出错时返回默认值
  }
}

/**
 * 设置群组最大成员数
 * @param {number} maxMembers - 最大成员数
 * @returns {Promise<boolean>} 是否设置成功
 */
async function setMaxGroupMembers(maxMembers) {
  if (!Number.isInteger(Number(maxMembers)) || Number(maxMembers) <= 0) {
    throw new Error('最大成员数必须是大于0的整数');
  }
  
  return await updateConfig('max_group_members', String(maxMembers), '群组最大成员数');
}

/**
 * 获取群主收益率配置
 * @returns {Promise<number>} 群主收益率（0-1之间的小数）
 */
async function getGroupOwnerCommissionRate() {
  try {
    const config = await getConfigByKey('group_owner_commission_rate');
    return config ? parseFloat(config.value) : 0.1; // 默认10%
  } catch (error) {
    logger.error(`获取群主收益率配置失败: ${error.message}`);
    return 0.1; // 出错时返回默认值
  }
}

/**
 * 设置群主收益率
 * @param {number} rate - 收益率（0-1之间的小数）
 * @returns {Promise<boolean>} 是否设置成功
 */
async function setGroupOwnerCommissionRate(rate) {
  if (typeof rate !== 'number' && typeof rate !== 'string') {
    throw new Error('收益率必须是数字类型');
  }
  
  const rateNum = parseFloat(rate);
  if (isNaN(rateNum) || rateNum < 0 || rateNum > 1) {
    throw new Error('收益率必须是0-1之间的小数');
  }
  
  return await updateConfig('group_owner_commission_rate', String(rateNum), '群主收益率（0-1之间的小数）');
}

/**
 * 获取邀请奖励金额配置
 * @returns {Promise<number>} 邀请奖励金额
 */
async function getInviteRewardAmount() {
  try {
    const config = await getConfigByKey('invite_reward_amount');
    return config ? parseFloat(config.value) : 5.00; // 默认5元
  } catch (error) {
    logger.error(`获取邀请奖励金额配置失败: ${error.message}`);
    return 5.00; // 出错时返回默认值
  }
}

/**
 * 设置邀请奖励金额
 * @param {number} amount - 奖励金额（大于等于0的数字）
 * @returns {Promise<boolean>} 是否设置成功
 */
async function setInviteRewardAmount(amount) {
  if (typeof amount !== 'number' && typeof amount !== 'string') {
    throw new Error('奖励金额必须是数字类型');
  }
  
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum < 0) {
    throw new Error('奖励金额必须是大于等于0的数字');
  }
  
  return await updateConfig('invite_reward_amount', String(amountNum.toFixed(2)), '邀请奖励金额（元）');
}

/**
 * 批量更新系统配置
 * @param {Object} configs - 配置对象，键为配置键，值为配置值
 * @returns {Promise<boolean>} 是否全部更新成功
 */
async function updateConfigs(configs) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    for (const key in configs) {
      if (Object.prototype.hasOwnProperty.call(configs, key)) {
        const value = configs[key];
        
        // 检查配置是否存在
        const [existingConfig] = await connection.query(
          'SELECT id, description FROM system_config WHERE config_key = ?',
          [key]
        );
        
        if (existingConfig.length > 0) {
          // 更新配置，保持原有的描述
          await connection.query(
            'UPDATE system_config SET config_value = ? WHERE config_key = ?',
            [String(value), key]
          );
        } else {
          // 如果配置不存在，跳过（不创建新配置）
          logger.warn(`配置键 "${key}" 不存在，已跳过`);
        }
      }
    }
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`批量更新系统配置失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getAllConfigs,
  getConfigByKey,
  updateConfig,
  updateConfigs,
  getMaxGroupMembers,
  setMaxGroupMembers,
  getGroupOwnerCommissionRate,
  setGroupOwnerCommissionRate,
  getInviteRewardAmount,
  setInviteRewardAmount
}; 