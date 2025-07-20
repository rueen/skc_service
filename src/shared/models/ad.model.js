/**
 * 广告模型
 * 处理广告相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化广告信息
 * @param {Object} ad - 广告信息
 * @returns {Object} 格式化后的广告信息
 */
function formatAd(ad) {
  if (!ad) return null;

  // 转换字段名称为驼峰命名法
  const formattedAd = convertToCamelCase({
    ...ad,
    startTime: formatDateTime(ad.start_time),
    endTime: formatDateTime(ad.end_time),
    createTime: formatDateTime(ad.create_time),
    updateTime: formatDateTime(ad.update_time),
  });

  // 安全解析 JSON 字段
  try {
    if (typeof ad.content === 'string' && ad.content.trim()) {
      formattedAd.content = JSON.parse(ad.content);
    } else if (ad.content && typeof ad.content === 'object') {
      formattedAd.content = ad.content;
    } else {
      formattedAd.content = {};
    }
  } catch (error) {
    logger.error(`解析广告content失败: ${error.message}, 原始值: ${ad.content}`);
    formattedAd.content = {};
  }

  // 计算广告状态
  const now = new Date();
  const startTime = new Date(ad.start_time);
  const endTime = new Date(ad.end_time);

  if (now < startTime) {
    formattedAd.status = 'not_started';
  } else if (now >= startTime && now <= endTime) {
    formattedAd.status = 'processing';
  } else {
    formattedAd.status = 'ended';
  }

  return formattedAd;
}

/**
 * 将 ISO 格式的日期时间字符串转换为 MySQL 兼容的格式
 * @param {string} dateTimeString - ISO 格式的日期时间字符串
 * @returns {string} MySQL 兼容的日期时间字符串
 */
function formatDateTimeForMySQL(dateTimeString) {
  if (!dateTimeString) return null;
  
  try {
    // 解析日期时间字符串，保留原始时区
    // 格式化为 MySQL 兼容的格式: YYYY-MM-DD HH:MM:SS
    // 直接替换 T 和 Z 以保留原始时间，不进行时区转换
    return dateTimeString.replace('T', ' ').replace(/\.\d+Z$/, '').replace('Z', '');
  } catch (error) {
    logger.error(`日期时间格式转换失败: ${error.message}, 原始值: ${dateTimeString}`);
    return null;
  }
}

/**
 * 获取广告列表
 * @param {Object} filters - 筛选条件
 * @param {string} filters.title - 广告标题
 * @param {string} filters.status - 广告状态
 * @param {string} filters.location - 广告位置
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {Object} sortOptions - 排序选项 { field: 'startTime', order: 'ascend' }
 * @returns {Promise<Object>} 包含列表、总数、页码、页大小的对象
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, sortOptions = {}) {
  try {
    let query = `
      SELECT a.*
      FROM ads a
    `;
    
    let countQuery = `SELECT COUNT(*) as total FROM ads a`;
    const queryParams = [];
    const conditions = [];

    // 添加基本筛选条件
    if (filters.title) {
      conditions.push('a.title LIKE ?');
      queryParams.push(`%${filters.title}%`);
    }
    
    if (filters.location) {
      conditions.push('a.location = ?');
      queryParams.push(filters.location);
    }

    // 状态筛选需要通过时间条件实现
    if (filters.status) {
      const now = new Date();
      const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');
      
      switch (filters.status) {
        case 'not_started':
          conditions.push('a.start_time > ?');
          queryParams.push(nowStr);
          break;
        case 'processing':
          conditions.push('a.start_time <= ? AND a.end_time >= ?');
          queryParams.push(nowStr, nowStr);
          break;
        case 'ended':
          conditions.push('a.end_time < ?');
          queryParams.push(nowStr);
          break;
      }
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 获取总数
    const [countResult] = await pool.query(countQuery, queryParams);
    const total = countResult[0].total;

    // 如果总数为0，直接返回空结果
    if (total === 0) {
      return {
        list: [],
        total: 0,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10)
      };
    }

    // 添加排序和分页
    let orderByClause = ' ORDER BY a.create_time DESC'; // 默认按创建时间倒序
    
    if (sortOptions.field && sortOptions.order) {
      // 字段映射，将前端字段名映射到数据库字段名
      const fieldMap = {
        'startTime': 'a.start_time',
        'endTime': 'a.end_time',
        'createTime': 'a.create_time',
        'updateTime': 'a.update_time'
      };
      
      const dbField = fieldMap[sortOptions.field];
      if (dbField) {
        const direction = sortOptions.order === 'ascend' ? 'ASC' : 'DESC';
        orderByClause = ` ORDER BY ${dbField} ${direction}`;
      }
    }
    
    query += orderByClause + ' LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 格式化列表数据
    const formattedList = rows.map(formatAd);
    
    return {
      list: formattedList,
      total: total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取广告列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取广告详情
 * @param {number} id - 广告ID
 * @returns {Promise<Object>} 广告详情
 */
async function getDetail(id) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM ads WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatAd(rows[0]);
  } catch (error) {
    logger.error(`获取广告详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建广告
 * @param {Object} adData - 广告数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(adData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查位置是否存在
    const [locations] = await connection.query(
      'SELECT id FROM locations WHERE code = ?',
      [adData.location]
    );
    
    if (locations.length === 0) {
      throw new Error('所选位置不存在');
    }
    
    // 格式化日期时间为 MySQL 兼容格式
    const startTime = formatDateTimeForMySQL(adData.startTime);
    const endTime = formatDateTimeForMySQL(adData.endTime);
    
    // 验证时间逻辑
    if (new Date(startTime) >= new Date(endTime)) {
      throw new Error('开始时间必须早于结束时间');
    }
    
    // 安全处理 JSON 数据
    let contentJson = '{}';
    try {
      contentJson = JSON.stringify(adData.content || {});
    } catch (error) {
      logger.error(`序列化content失败: ${error.message}`);
      contentJson = '{}';
    }
    
    // 创建广告
    const [result] = await connection.query(
      `INSERT INTO ads 
       (title, location, start_time, end_time, content)
       VALUES (?, ?, ?, ?, ?)`,
      [
        adData.title,
        adData.location,
        startTime,
        endTime,
        contentJson
      ]
    );
    
    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建广告失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新广告
 * @param {Object} adData - 广告数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(adData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查广告是否存在
    const [existingAd] = await connection.query(
      'SELECT id FROM ads WHERE id = ?',
      [adData.id]
    );
    
    if (existingAd.length === 0) {
      throw new Error('广告不存在');
    }
    
    // 检查位置是否存在
    if (adData.location) {
      const [locations] = await connection.query(
        'SELECT id FROM locations WHERE code = ?',
        [adData.location]
      );
      
      if (locations.length === 0) {
        throw new Error('所选位置不存在');
      }
    }
    
    // 构建更新语句
    const updateFields = [];
    const params = [];
    
    if (adData.title !== undefined) {
      updateFields.push('title = ?');
      params.push(adData.title);
    }
    
    if (adData.location !== undefined) {
      updateFields.push('location = ?');
      params.push(adData.location);
    }
    
    if (adData.startTime !== undefined) {
      const formattedStartTime = formatDateTimeForMySQL(adData.startTime);
      updateFields.push('start_time = ?');
      params.push(formattedStartTime);
    }
    
    if (adData.endTime !== undefined) {
      const formattedEndTime = formatDateTimeForMySQL(adData.endTime);
      updateFields.push('end_time = ?');
      params.push(formattedEndTime);
    }
    
    if (adData.content !== undefined) {
      try {
        const contentJson = JSON.stringify(adData.content || {});
        updateFields.push('content = ?');
        params.push(contentJson);
      } catch (error) {
        logger.error(`序列化content失败: ${error.message}`);
        // 使用空对象作为默认值
        updateFields.push('content = ?');
        params.push('{}');
      }
    }
    
    if (updateFields.length === 0) {
      return true; // 没有需要更新的字段
    }
    
    params.push(adData.id);
    
    // 更新广告信息
    await connection.query(
      `UPDATE ads SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新广告失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除广告
 * @param {number} id - 广告ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查广告是否存在
    const [ad] = await connection.query(
      'SELECT id FROM ads WHERE id = ?',
      [id]
    );
    
    if (ad.length === 0) {
      throw new Error('广告不存在');
    }
    
    // 删除广告
    const [result] = await connection.query(
      'DELETE FROM ads WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除广告失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取H5端广告列表（根据位置和有效期）
 * @param {string} location - 位置代码
 * @returns {Promise<Array>} 广告列表
 */
async function getH5List(location) {
  try {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 19).replace('T', ' ');
    
    const [rows] = await pool.query(
      `SELECT * FROM ads 
       WHERE location = ? 
       AND start_time <= ? 
       AND end_time >= ?
       ORDER BY create_time DESC`,
      [location, nowStr, nowStr]
    );
    
    // 格式化数据
    return rows.map(formatAd);
  } catch (error) {
    logger.error(`获取H5端广告列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove,
  getH5List
}; 