/**
 * 小二模型
 * 处理小二相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');

/**
 * 格式化小二信息
 * @param {Object} waiter - 小二信息
 * @returns {Object} 格式化后的小二信息
 */
function formatWaiter(waiter) {
  if (!waiter) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedWaiter = convertToCamelCase({
    ...waiter,
    lastLoginTime: formatDateTime(waiter.last_login_time),
    createTime: formatDateTime(waiter.create_time),
    updateTime: formatDateTime(waiter.update_time)
  });
  
  return formattedWaiter;
}

/**
 * 根据用户名查找小二
 * @param {string} username - 小二用户名
 * @returns {Promise<Object|null>} 小二信息或null
 */
async function findByUsername(username) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM waiters WHERE username = ?',
      [username]
    );
    return rows.length > 0 ? formatWaiter(rows[0]) : null;
  } catch (error) {
    logger.error(`根据用户名查找小二失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID查找小二
 * @param {number} id - 小二ID
 * @returns {Promise<Object|null>} 小二信息或null
 */
async function findById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM waiters WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? formatWaiter(rows[0]) : null;
  } catch (error) {
    logger.error(`根据ID查找小二失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取小二列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 小二列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = 'SELECT id, username, is_admin, remarks, permissions, last_login_time, create_time, update_time FROM waiters';
    let countQuery = 'SELECT COUNT(*) as total FROM waiters';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.keyword) {
      conditions.push('(username LIKE ? OR remarks LIKE ?)');
      queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
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
      list: rows.map(formatWaiter),
      total: countResult[0].total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取小二列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建小二
 * @param {Object} waiterData - 小二数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(waiterData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO waiters (username, password, is_admin, remarks, permissions) VALUES (?, ?, ?, ?, ?)',
      [
        waiterData.username,
        waiterData.password,
        waiterData.isAdmin ? 1 : 0,
        waiterData.remarks || null,
        waiterData.permissions || null
      ]
    );

    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建小二失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新小二信息
 * @param {number} id - 小二ID
 * @param {Object} waiterData - 小二数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(id, waiterData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const updateFields = [];
    const queryParams = [];

    // 构建更新字段
    if (waiterData.username) {
      updateFields.push('username = ?');
      queryParams.push(waiterData.username);
    }

    if (waiterData.password) {
      updateFields.push('password = ?');
      queryParams.push(waiterData.password);
    }

    if (waiterData.isAdmin !== undefined) {
      updateFields.push('is_admin = ?');
      queryParams.push(waiterData.isAdmin ? 1 : 0);
    }

    if (waiterData.remarks !== undefined) {
      updateFields.push('remarks = ?');
      queryParams.push(waiterData.remarks);
    }

    if (waiterData.permissions !== undefined) {
      updateFields.push('permissions = ?');
      queryParams.push(waiterData.permissions);
    }

    // 如果没有要更新的字段，直接返回
    if (updateFields.length === 0) {
      await connection.commit();
      return true;
    }

    // 添加ID参数
    queryParams.push(id);

    // 执行更新
    const [result] = await connection.query(
      `UPDATE waiters SET ${updateFields.join(', ')} WHERE id = ?`,
      queryParams
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新小二信息失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除小二
 * @param {number} id - 小二ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'DELETE FROM waiters WHERE id = ?',
      [id]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除小二失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新最后登录时间
 * @param {number} id - 小二ID
 * @returns {Promise<boolean>} 更新是否成功
 */
async function updateLastLoginTime(id) {
  try {
    const [result] = await pool.query(
      'UPDATE waiters SET last_login_time = NOW() WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`更新最后登录时间失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findByUsername,
  findById,
  getList,
  create,
  update,
  remove,
  updateLastLoginTime
}; 