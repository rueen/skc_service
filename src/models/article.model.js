/**
 * 文章模型
 * 处理文章相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');

/**
 * 格式化文章信息
 * @param {Object} article - 文章信息
 * @returns {Object} 格式化后的文章信息
 */
function formatArticle(article) {
  if (!article) return null;
  return {
    ...article,
    create_time: formatDateTime(article.create_time),
    update_time: formatDateTime(article.update_time)
  };
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
 * 更新或创建文章
 * @param {Object} articleData - 文章数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function updateOrCreate(articleData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingArticle] = await connection.query(
      'SELECT id FROM articles WHERE location = ?',
      [articleData.location]
    );

    let result;
    if (existingArticle.length > 0) {
      // 更新现有文章
      [result] = await connection.query(
        'UPDATE articles SET title = ?, content = ? WHERE location = ?',
        [articleData.title, articleData.content, articleData.location]
      );
    } else {
      // 创建新文章
      [result] = await connection.query(
        'INSERT INTO articles (title, content, location) VALUES (?, ?, ?)',
        [articleData.title, articleData.content, articleData.location]
      );
    }

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

module.exports = {
  getByLocation,
  updateOrCreate
}; 