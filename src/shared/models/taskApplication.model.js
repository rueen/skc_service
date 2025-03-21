/**
 * 任务报名模型
 * 处理任务报名相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');

/**
 * 格式化任务报名信息
 * @param {Object} application - 报名信息
 * @returns {Object} 格式化后的报名信息
 */
function formatTaskApplication(application) {
  if (!application) return null;
  
  return {
    id: application.id,
    taskId: application.task_id,
    memberId: application.member_id,
    taskName: application.task_name || '',
    channelName: application.channel_name || '',
    reward: application.reward || 0,
    status: application.status || 'applied', // applied: 已报名, submitted: 已提交, completed: 已完成
    applyTime: formatDateTime(application.apply_time),
    createTime: formatDateTime(application.create_time),
    updateTime: formatDateTime(application.update_time)
  };
}

/**
 * 获取任务报名列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 任务报名列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let baseQuery = `
      SELECT ta.*, t.task_name, c.name as channel_name, t.reward
      FROM task_applications ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN channels c ON t.channel_id = c.id
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM task_applications ta
    `;
    
    const queryParams = [];
    const conditions = [];
    
    // 添加筛选条件
    if (filters.memberId) {
      conditions.push('ta.member_id = ?');
      queryParams.push(filters.memberId);
    }
    
    if (filters.taskId) {
      conditions.push('ta.task_id = ?');
      queryParams.push(filters.taskId);
    }
    
    if (filters.status) {
      conditions.push('ta.status = ?');
      queryParams.push(filters.status);
    }
    
    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      baseQuery += whereClause;
      countQuery += whereClause;
    }
    
    // 添加排序和分页
    baseQuery += ' ORDER BY ta.create_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));
    
    // 执行查询
    const [rows] = await pool.query(baseQuery, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    // 格式化结果
    const applications = rows.map(formatTaskApplication);
    
    return {
      list: applications,
      total: countResult[0].total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取任务报名列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取任务报名详情
 * @param {number} id - 报名ID
 * @returns {Promise<Object|null>} 报名详情或null
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT ta.*, t.task_name, c.name as channel_name, t.reward
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN channels c ON t.channel_id = c.id
       WHERE ta.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatTaskApplication(rows[0]);
  } catch (error) {
    logger.error(`获取任务报名详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据任务ID和会员ID获取任务报名详情
 * @param {number} taskId - 任务ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object|null>} 报名详情或null
 */
async function getByTaskAndMember(taskId, memberId) {
  try {
    const [rows] = await pool.query(
      `SELECT ta.*, t.task_name, c.name as channel_name, t.reward
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN channels c ON t.channel_id = c.id
       WHERE ta.task_id = ? AND ta.member_id = ?`,
      [taskId, memberId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatTaskApplication(rows[0]);
  } catch (error) {
    logger.error(`获取任务报名详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据会员ID获取所有已报名的任务
 * @param {number} memberId - 会员ID
 * @returns {Promise<Array>} 任务报名列表
 */
async function getListByMemberId(memberId) {
  try {
    const [rows] = await pool.query(
      `SELECT ta.*, t.task_name, c.name as channel_name, t.reward
       FROM task_applications ta
       JOIN tasks t ON ta.task_id = t.id
       LEFT JOIN channels c ON t.channel_id = c.id
       WHERE ta.member_id = ?`,
      [memberId]
    );
    
    return rows.map(formatTaskApplication);
  } catch (error) {
    logger.error(`获取会员任务报名列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建任务报名
 * @param {Object} applicationData - 报名数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(applicationData) {
  try {
    const { taskId, memberId } = applicationData;
    
    // 检查是否已经报名过该任务
    const existingApplication = await getByTaskAndMember(taskId, memberId);
    if (existingApplication) {
      throw new Error('已经报名过该任务');
    }
    
    // 创建任务报名
    const [result] = await pool.query(
      `INSERT INTO task_applications 
       (task_id, member_id, status, apply_time)
       VALUES (?, ?, ?, ?)`,
      [
        taskId,
        memberId,
        'applied', // 默认状态为已报名
        new Date()
      ]
    );
    
    return { id: result.insertId };
  } catch (error) {
    logger.error(`创建任务报名失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新任务报名状态
 * @param {number} id - 报名ID
 * @param {string} status - 新状态
 * @returns {Promise<boolean>} 更新结果
 */
async function updateStatus(id, status) {
  try {
    const [result] = await pool.query(
      'UPDATE task_applications SET status = ?, update_time = NOW() WHERE id = ?',
      [status, id]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`更新任务报名状态失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据任务ID和会员ID更新状态
 * @param {number} taskId - 任务ID
 * @param {number} memberId - 会员ID
 * @param {string} status - 新状态
 * @returns {Promise<boolean>} 更新结果
 */
async function updateStatusByTaskAndMember(taskId, memberId, status) {
  try {
    const [result] = await pool.query(
      'UPDATE task_applications SET status = ?, update_time = NOW() WHERE task_id = ? AND member_id = ?',
      [status, taskId, memberId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`更新任务报名状态失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除任务报名
 * @param {number} id - 报名ID
 * @returns {Promise<boolean>} 删除结果
 */
async function remove(id) {
  try {
    const [result] = await pool.query(
      'DELETE FROM task_applications WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`删除任务报名失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getList,
  getById,
  getByTaskAndMember,
  getListByMemberId,
  create,
  updateStatus,
  updateStatusByTaskAndMember,
  remove
}; 