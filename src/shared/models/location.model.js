/*
 * @Author: diaochan
 * @Date: 2025-07-20 12:12:44
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-20 16:19:37
 * @Description: 
 */
/**
 * 位置模型
 * 处理位置相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化位置信息
 * @param {Object} location - 位置信息
 * @returns {Object} 格式化后的位置信息
 */
function formatLocation(location) {
  if (!location) return null;

  // 转换字段名称为驼峰命名法
  return convertToCamelCase({
    ...location,
    createTime: formatDateTime(location.create_time),
    updateTime: formatDateTime(location.update_time),
  });
}

/**
 * 获取位置列表
 * @param {Object} filters - 筛选条件
 * @param {string} filters.type - 位置类型
 * @returns {Promise<Array>} 位置列表
 */
async function getList(filters = {}) {
  try {
    let query = 'SELECT * FROM locations';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.type) {
      conditions.push('type = ?');
      queryParams.push(filters.type);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY create_time ASC';

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 格式化数据
    return rows.map(formatLocation);
  } catch (error) {
    logger.error(`获取位置列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getList
}; 