/**
 * 渠道模型
 * 处理渠道相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const { convertToCamelCase } = require('../utils/data.util');
const i18n = require('../utils/i18n.util');

/**
 * 格式化渠道信息
 * @param {Object} channel - 渠道信息
 * @returns {Object} 格式化后的渠道信息
 */
function formatChannel(channel) {
  if (!channel) return null;
  
  let customFields = null;
  try {
    // 只有当 custom_fields 不是 null 且是字符串时才尝试解析
    if (channel.custom_fields && typeof channel.custom_fields === 'string') {
      customFields = JSON.parse(channel.custom_fields);
    } else if (channel.custom_fields) {
      // 如果已经是对象（MySQL8可能直接返回JSON对象）
      customFields = channel.custom_fields;
    }
  } catch (error) {
    logger.error(`解析渠道自定义字段失败: ${error.message}`);
  }
  
  const formattedChannel = convertToCamelCase({
    ...channel,
    customFields: customFields,
    createTime: formatDateTime(channel.create_time),
    updateTime: formatDateTime(channel.update_time)
  });
  
  return formattedChannel;
}

/**
 * 获取渠道列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 渠道列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = 'SELECT * FROM channels';
    let countQuery = 'SELECT COUNT(*) as total FROM channels';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.keyword) {
      conditions.push('name LIKE ?');
      queryParams.push(`%${filters.keyword}%`);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 添加排序和分页
    query += ' ORDER BY create_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    return {
      list: rows.map(formatChannel),
      total: countResult[0].total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取渠道列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取渠道
 * @param {number} id - 渠道ID
 * @returns {Promise<Object|null>} 渠道信息或null
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM channels WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? formatChannel(rows[0]) : null;
  } catch (error) {
    logger.error(`获取渠道失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建渠道
 * @param {Object} channelData - 渠道数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(channelData, lang) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查渠道名称是否已存在
    const [existing] = await connection.query(
      'SELECT id FROM channels WHERE name = ?',
      [channelData.name]
    );

    if (existing.length > 0) {
      throw new Error(i18n.t('channel.common.nameExists', lang));
    }

    // 处理customFields字段
    let customFieldsJson = null;
    if (channelData.customFields) {
      try {
        // 如果已经是字符串，则验证是否为有效的JSON
        if (typeof channelData.customFields === 'string') {
          // 尝试解析然后重新stringify确保格式正确
          customFieldsJson = JSON.stringify(JSON.parse(channelData.customFields));
        } else {
          // 如果是对象（数组也是对象），直接stringify
          customFieldsJson = JSON.stringify(channelData.customFields);
        }
      } catch (error) {
        logger.warn(`自定义字段JSON解析失败，将设置为null: ${error.message}`);
      }
    }

    // 创建渠道
    const [result] = await connection.query(
      'INSERT INTO channels (name, icon, custom_fields) VALUES (?, ?, ?)',
      [channelData.name, channelData.icon, customFieldsJson]
    );

    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建渠道失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新渠道
 * @param {Object} channelData - 渠道数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(channelData, lang) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查渠道名称是否已存在（排除当前渠道）
    if (channelData.name) {
      const [existing] = await connection.query(
        'SELECT id FROM channels WHERE name = ? AND id != ?',
        [channelData.name, channelData.id]
      );

      if (existing.length > 0) {
        throw new Error(i18n.t('channel.common.nameExists', lang));
      }
    }

    // 构建更新语句
    const updateFields = [];
    const params = [];

    if (channelData.name) {
      updateFields.push('name = ?');
      params.push(channelData.name);
    }
    if (channelData.icon) {
      updateFields.push('icon = ?');
      params.push(channelData.icon);
    }
    if (channelData.customFields !== undefined) {
      updateFields.push('custom_fields = ?');
      
      // 安全处理customFields
      let customFieldsJson = null;
      if (channelData.customFields) {
        try {
          // 如果已经是字符串，则验证是否为有效的JSON
          if (typeof channelData.customFields === 'string') {
            // 尝试解析然后重新stringify确保格式正确
            customFieldsJson = JSON.stringify(JSON.parse(channelData.customFields));
          } else {
            // 如果是对象（数组也是对象），直接stringify
            customFieldsJson = JSON.stringify(channelData.customFields);
          }
        } catch (error) {
          logger.warn(`更新时自定义字段JSON解析失败，将设置为null: ${error.message}`);
        }
      }
      
      params.push(customFieldsJson);
    }

    if (updateFields.length === 0) {
      return true; // 没有需要更新的字段
    }

    params.push(channelData.id);
    const [result] = await connection.query(
      `UPDATE channels SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新渠道失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除渠道
 * @param {number} id - 渠道ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(id, lang) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查是否有关联的账号
    const [accounts] = await connection.query(
      'SELECT COUNT(*) as count FROM accounts WHERE channel_id = ?',
      [id]
    );

    if (accounts[0].count > 0) {
      throw new Error(i18n.t('channel.common.associatedAccounts', lang));
    }

    // 检查是否有关联的任务
    const [tasks] = await connection.query(
      'SELECT COUNT(*) as count FROM tasks WHERE channel_id = ?',
      [id]
    );

    if (tasks[0].count > 0) {
      throw new Error(i18n.t('channel.common.associatedTasks', lang));
    }

    // 删除渠道
    const [result] = await connection.query(
      'DELETE FROM channels WHERE id = ?',
      [id]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除渠道失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getList,
  getById,
  create,
  update,
  remove
}; 