/**
 * 文章模型
 * 处理文章相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');

/**
 * 格式化文章信息
 * @param {Object} article - 文章信息
 * @returns {Object} 格式化后的文章信息
 */
function formatArticle(article) {
  if (!article) return null;
  
  // 提取基本字段
  const formattedArticle = { ...article };
  
  // 格式化时间字段，使用驼峰命名法
  formattedArticle.createTime = formatDateTime(article.create_time);
  formattedArticle.updateTime = formatDateTime(article.update_time);
  
  // 删除原始字段
  delete formattedArticle.create_time;
  delete formattedArticle.update_time;
  
  return formattedArticle;
}

/**
 * 根据位置标识获取文章
 * @param {string} location - 文章位置标识
 * @returns {Promise<Object|null>} 文章信息或null
 */
async function getByLocation(location) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM articles WHERE location = ?',
      [location]
    );
    return rows.length > 0 ? formatArticle(rows[0]) : null;
  } catch (error) {
    logger.error(`获取文章失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取文章
 * @param {number} id - 文章ID
 * @returns {Promise<Object|null>} 文章信息或null
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? formatArticle(rows[0]) : null;
  } catch (error) {
    logger.error(`获取文章失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取文章列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 文章列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = 'SELECT * FROM articles';
    let countQuery = 'SELECT COUNT(*) as total FROM articles';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.keyword) {
      conditions.push('(title LIKE ? OR content LIKE ?)');
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
      list: rows.map(formatArticle),
      total: countResult[0].total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取文章列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建文章
 * @param {Object} articleData - 文章数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(articleData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查 location 是否已存在
    const [existing] = await connection.query(
      'SELECT id FROM articles WHERE location = ?',
      [articleData.location]
    );

    if (existing.length > 0) {
      throw new Error('文章位置标识已存在');
    }

    // 创建文章
    const [result] = await connection.query(
      'INSERT INTO articles (title, content, location) VALUES (?, ?, ?)',
      [articleData.title, articleData.content, articleData.location]
    );

    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建文章失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新文章
 * @param {Object} articleData - 文章数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(articleData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let query = 'UPDATE articles SET title = ?, content = ?';
    const params = [articleData.title, articleData.content];

    // 如果要更新 location，需要检查唯一性
    if (articleData.location) {
      // 检查新的 location 是否已存在（排除当前文章）
      const [existing] = await connection.query(
        'SELECT id FROM articles WHERE location = ? AND id != ?',
        [articleData.location, articleData.id]
      );

      if (existing.length > 0) {
        throw new Error('文章位置标识已存在');
      }

      query += ', location = ?';
      params.push(articleData.location);
    }

    // 根据 id 更新
    query += ' WHERE id = ?';
    params.push(articleData.id);

    const [result] = await connection.query(query, params);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新文章失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除文章
 * @param {Object} condition - 删除条件（id 或 location）
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(condition) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let query = 'DELETE FROM articles WHERE ';
    const params = [];

    if (condition.id) {
      query += 'id = ?';
      params.push(condition.id);
    } else {
      query += 'location = ?';
      params.push(condition.location);
    }

    const [result] = await connection.query(query, params);
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除文章失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getByLocation,
  getById,
  getList,
  create,
  update,
  remove
}; 