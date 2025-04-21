/**
 * 系统配置模型
 * 处理系统配置相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

// 系统配置不需要格式化

/**
 * 获取所有系统配置
 * @returns {Promise<Array>} 配置列表
 */
async function getAllConfigs() {
  try {
    const [rows] = await pool.query('SELECT * FROM system_config ORDER BY config_key');
    
    return rows;
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
    
    return rows[0];
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
    return config ? parseInt(config.config_value, 10) : 200; // 默认200
  } catch (error) {
    logger.error(`获取最大群成员数失败: ${error.message}`);
    return 200; // 出错时返回默认值
  }
}

/**
 * 获取群主收益率配置
 * @returns {Promise<number>} 群主收益率（0-1之间的小数）
 */
async function getGroupOwnerCommissionRate() {
  try {
    const config = await getConfigByKey('group_owner_commission_rate');
    return config ? parseFloat(config.config_value) : 0.1; // 默认10%
  } catch (error) {
    logger.error(`获取群主收益率配置失败: ${error.message}`);
    return 0.1; // 出错时返回默认值
  }
}

/**
 * 获取邀请奖励金额配置
 * @returns {Promise<number>} 邀请奖励金额
 */
async function getInviteRewardAmount() {
  try {
    const config = await getConfigByKey('invite_reward_amount');
    return config ? parseFloat(config.config_value) : 5.00; // 默认5元
  } catch (error) {
    logger.error(`获取邀请奖励金额配置失败: ${error.message}`);
    return 5.00; // 出错时返回默认值
  }
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
  getGroupOwnerCommissionRate,
  getInviteRewardAmount,
}; 