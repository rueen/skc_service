/**
 * 站内信模型
 * 处理站内信相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');

/**
 * 格式化站内信信息
 * @param {Object} message - 站内信信息
 * @returns {Object} 格式化后的站内信信息
 */
function formatMessage(message) {
  if (!message) return null;
  
  const formattedMessage = convertToCamelCase({
    ...message,
    startTime: formatDateTime(message.start_time),
    endTime: formatDateTime(message.end_time),
    createTime: formatDateTime(message.create_time),
    updateTime: formatDateTime(message.update_time)
  });
  
  // 计算站内信状态
  const now = new Date();
  const startTime = new Date(message.start_time);
  const endTime = new Date(message.end_time);
  
  if (now < startTime) {
    formattedMessage.status = 'not_started';
  } else if (now >= startTime && now <= endTime) {
    formattedMessage.status = 'processing';
  } else {
    formattedMessage.status = 'ended';
  }
  
  return formattedMessage;
}

/**
 * 获取站内信列表（管理端）
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {Object} sortOptions - 排序选项
 * @returns {Promise<Object>} 站内信列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, sortOptions = {}) {
  try {
    let query = 'SELECT * FROM messages';
    let countQuery = 'SELECT COUNT(*) as total FROM messages';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.title) {
      conditions.push('title LIKE ?');
      queryParams.push(`%${filters.title}%`);
    }

    // 状态筛选需要在应用层处理，因为状态是动态计算的
    // 这里先获取所有数据，然后在应用层过滤

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 添加排序
    let orderByClause = ' ORDER BY create_time DESC';
    
    if (sortOptions.field && sortOptions.order) {
      const fieldMap = {
        'startTime': 'start_time',
        'endTime': 'end_time',
        'updateTime': 'update_time',
        'createTime': 'create_time'
      };
      
      const dbField = fieldMap[sortOptions.field];
      if (dbField) {
        const direction = sortOptions.order === 'ascend' ? 'ASC' : 'DESC';
        orderByClause = ` ORDER BY ${dbField} ${direction}`;
      }
    }

    query += orderByClause;

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 格式化并过滤状态
    let formattedMessages = rows.map(formatMessage);
    
    // 状态筛选
    if (filters.status) {
      formattedMessages = formattedMessages.filter(message => message.status === filters.status);
    }

    // 手动分页（因为状态筛选需要在应用层处理）
    const total = formattedMessages.length;
    const startIndex = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    const endIndex = startIndex + parseInt(pageSize, 10);
    const paginatedMessages = formattedMessages.slice(startIndex, endIndex);

    return {
      list: paginatedMessages,
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取站内信列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取站内信详情
 * @param {number} id - 站内信ID
 * @returns {Promise<Object|null>} 站内信详情或null
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM messages WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatMessage(rows[0]);
  } catch (error) {
    logger.error(`获取站内信详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建站内信
 * @param {Object} messageData - 站内信数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(messageData) {
  try {
    const [result] = await pool.query(
      'INSERT INTO messages (title, content, start_time, end_time) VALUES (?, ?, ?, ?)',
      [
        messageData.title,
        messageData.content,
        messageData.startTime,
        messageData.endTime
      ]
    );
    
    return { id: result.insertId };
  } catch (error) {
    logger.error(`创建站内信失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新站内信
 * @param {number} id - 站内信ID
 * @param {Object} messageData - 站内信数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(id, messageData) {
  try {
    const updateFields = [];
    const params = [];
    
    if (messageData.title !== undefined) {
      updateFields.push('title = ?');
      params.push(messageData.title);
    }
    
    if (messageData.content !== undefined) {
      updateFields.push('content = ?');
      params.push(messageData.content);
    }
    
    if (messageData.startTime !== undefined) {
      updateFields.push('start_time = ?');
      params.push(messageData.startTime);
    }
    
    if (messageData.endTime !== undefined) {
      updateFields.push('end_time = ?');
      params.push(messageData.endTime);
    }
    
    if (updateFields.length === 0) {
      return true;
    }
    
    params.push(id);
    
    const [result] = await pool.query(
      `UPDATE messages SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`更新站内信失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除站内信
 * @param {number} id - 站内信ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 删除相关的阅读记录
    await connection.query(
      'DELETE FROM message_reads WHERE message_id = ?',
      [id]
    );
    
    // 删除站内信
    const [result] = await connection.query(
      'DELETE FROM messages WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除站内信失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取有效期内的站内信列表（H5端）
 * @param {number} memberId - 会员ID，用于过滤已读消息
 * @returns {Promise<Array>} 有效期内且未读的站内信列表
 */
async function getValidMessages(memberId = null) {
  try {
    const now = new Date();
    
    if (memberId) {
      // 如果提供了会员ID，过滤掉已读的消息
      const [rows] = await pool.query(
        `SELECT m.* FROM messages m 
         WHERE m.start_time <= ? AND m.end_time >= ? 
         AND m.id NOT IN (
           SELECT mr.message_id FROM message_reads mr WHERE mr.member_id = ?
         )
         ORDER BY m.create_time DESC`,
        [now, now, memberId]
      );
      
      return rows.map(formatMessage);
    } else {
      // 如果没有提供会员ID，返回所有有效期内的消息
      const [rows] = await pool.query(
        'SELECT * FROM messages WHERE start_time <= ? AND end_time >= ? ORDER BY create_time DESC',
        [now, now]
      );
      
      return rows.map(formatMessage);
    }
  } catch (error) {
    logger.error(`获取有效期内站内信列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 标记站内信为已读
 * @param {number} messageId - 站内信ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<boolean>} 操作是否成功
 */
async function markAsRead(messageId, memberId) {
  try {
    await pool.query(
      'INSERT INTO message_reads (message_id, member_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE read_time = NOW()',
      [messageId, memberId]
    );
    
    return true;
  } catch (error) {
    logger.error(`标记站内信已读失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getList,
  getById,
  create,
  update,
  remove,
  getValidMessages,
  markAsRead,
  formatMessage
}; 