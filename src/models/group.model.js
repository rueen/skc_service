/**
 * 群组模型
 * 处理群组相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');

/**
 * 格式化群组信息
 * @param {Object} group - 群组信息
 * @returns {Object} 格式化后的群组信息
 */
function formatGroup(group) {
  if (!group) return null;
  return {
    id: group.id,
    groupName: group.group_name,
    groupLink: group.group_link,
    ownerId: group.owner_id,
    ownerName: group.owner_name,
    memberCount: group.member_count,
    createTime: formatDateTime(group.create_time),
    updateTime: formatDateTime(group.update_time)
  };
}

/**
 * 获取群组列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 群组列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = `
      SELECT g.*, m.member_nickname as owner_name 
      FROM \`groups\` g 
      LEFT JOIN members m ON g.owner_id = m.id
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM `groups` g';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.groupName) {
      conditions.push('g.group_name LIKE ?');
      queryParams.push(`%${filters.groupName}%`);
    }
    if (filters.ownerId) {
      conditions.push('g.owner_id = ?');
      queryParams.push(filters.ownerId);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 添加排序和分页
    query += ' ORDER BY g.create_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    return {
      list: rows.map(formatGroup),
      total: countResult[0].total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取群组列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取群组
 * @param {number} id - 群组ID
 * @returns {Promise<Object|null>} 群组信息或null
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, m.member_nickname as owner_name 
       FROM \`groups\` g 
       LEFT JOIN members m ON g.owner_id = m.id 
       WHERE g.id = ?`,
      [id]
    );
    return rows.length > 0 ? formatGroup(rows[0]) : null;
  } catch (error) {
    logger.error(`获取群组失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建群组
 * @param {Object} groupData - 群组数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(groupData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查群主是否存在
    if (groupData.ownerId) {
      const [owner] = await connection.query(
        'SELECT id FROM members WHERE id = ?',
        [groupData.ownerId]
      );

      if (owner.length === 0) {
        throw new Error('群主不存在');
      }
    }

    // 创建群组
    const [result] = await connection.query(
      'INSERT INTO `groups` (group_name, group_link, owner_id) VALUES (?, ?, ?)',
      [groupData.groupName, groupData.groupLink, groupData.ownerId]
    );

    // 如果指定了群主，更新会员表的群主标识
    if (groupData.ownerId) {
      await connection.query(
        'UPDATE members SET is_group_owner = 1 WHERE id = ?',
        [groupData.ownerId]
      );
    }

    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建群组失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新群组
 * @param {Object} groupData - 群组数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(groupData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 获取当前群组信息
    const [currentGroup] = await connection.query(
      'SELECT owner_id FROM `groups` WHERE id = ?',
      [groupData.id]
    );

    if (currentGroup.length === 0) {
      throw new Error('群组不存在');
    }

    // 如果更换了群主
    if (groupData.ownerId && currentGroup[0].owner_id !== groupData.ownerId) {
      // 检查新群主是否存在
      const [newOwner] = await connection.query(
        'SELECT id FROM members WHERE id = ?',
        [groupData.ownerId]
      );

      if (newOwner.length === 0) {
        throw new Error('新群主不存在');
      }

      // 更新旧群主的群主标识
      if (currentGroup[0].owner_id) {
        await connection.query(
          'UPDATE members SET is_group_owner = 0 WHERE id = ?',
          [currentGroup[0].owner_id]
        );
      }

      // 更新新群主的群主标识
      await connection.query(
        'UPDATE members SET is_group_owner = 1 WHERE id = ?',
        [groupData.ownerId]
      );
    }

    // 构建更新语句
    const updateFields = [];
    const params = [];

    if (groupData.groupName) {
      updateFields.push('group_name = ?');
      params.push(groupData.groupName);
    }
    if (groupData.groupLink) {
      updateFields.push('group_link = ?');
      params.push(groupData.groupLink);
    }
    if (groupData.ownerId) {
      updateFields.push('owner_id = ?');
      params.push(groupData.ownerId);
    }
    if (groupData.memberCount !== undefined) {
      updateFields.push('member_count = ?');
      params.push(groupData.memberCount);
    }

    if (updateFields.length === 0) {
      return true; // 没有需要更新的字段
    }

    params.push(groupData.id);
    const [result] = await connection.query(
      `UPDATE \`groups\` SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新群组失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除群组
 * @param {number} id - 群组ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 获取群组信息
    const [group] = await connection.query(
      'SELECT owner_id FROM `groups` WHERE id = ?',
      [id]
    );

    if (group.length === 0) {
      throw new Error('群组不存在');
    }

    // 检查是否有关联的会员
    const [members] = await connection.query(
      'SELECT COUNT(*) as count FROM members WHERE group_id = ?',
      [id]
    );

    if (members[0].count > 0) {
      throw new Error('该群组下存在关联会员，无法删除');
    }

    // 更新群主的群主标识
    if (group[0].owner_id) {
      await connection.query(
        'UPDATE members SET is_group_owner = 0 WHERE id = ?',
        [group[0].owner_id]
      );
    }

    // 删除群组
    const [result] = await connection.query(
      'DELETE FROM `groups` WHERE id = ?',
      [id]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除群组失败: ${error.message}`);
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