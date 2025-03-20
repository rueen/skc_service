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
      SELECT g.*, 
             m.member_nickname as owner_name,
             (SELECT COUNT(*) FROM member_groups mg WHERE mg.group_id = g.id) as member_count
      FROM \`groups\` g 
      LEFT JOIN members m ON g.owner_id = m.id
    `;
    
    // 如果有memberId筛选，需要通过member_groups表关联
    if (filters.memberId) {
      query = `
        SELECT g.*, 
               m.member_nickname as owner_name,
               (SELECT COUNT(*) FROM member_groups mg WHERE mg.group_id = g.id) as member_count
        FROM \`groups\` g 
        LEFT JOIN members m ON g.owner_id = m.id
        JOIN member_groups mg ON g.id = mg.group_id
      `;
    }
    
    let countQuery = 'SELECT COUNT(*) as total FROM `groups` g LEFT JOIN members m ON g.owner_id = m.id';
    
    // 同样为计数查询添加关联
    if (filters.memberId) {
      countQuery = `
        SELECT COUNT(DISTINCT g.id) as total 
        FROM \`groups\` g 
        LEFT JOIN members m ON g.owner_id = m.id
        JOIN member_groups mg ON g.id = mg.group_id
      `;
    }
    
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
    // 添加成员ID筛选条件
    if (filters.memberId) {
      conditions.push('mg.member_id = ?');
      queryParams.push(filters.memberId);
    }
    
    // 添加关键词搜索
    if (filters.keyword) {
      conditions.push('(g.group_name LIKE ? OR m.member_nickname LIKE ? OR g.group_link LIKE ?)');
      queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 添加排序和分页
    query += ' GROUP BY g.id ORDER BY g.create_time DESC LIMIT ? OFFSET ?';
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
      `SELECT g.*, 
              m.member_nickname as owner_name,
              (SELECT COUNT(*) FROM member_groups mg WHERE mg.group_id = g.id) as member_count
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

    // 如果指定了群主，创建会员-群组关联并设置为群主
    if (groupData.ownerId) {
      // 检查关联是否已存在
      const [existingRelation] = await connection.query(
        'SELECT id FROM member_groups WHERE member_id = ? AND group_id = ?',
        [groupData.ownerId, result.insertId]
      );
      
      if (existingRelation.length > 0) {
        // 如果已存在关联，更新为群主
        await connection.query(
          'UPDATE member_groups SET is_owner = 1 WHERE member_id = ? AND group_id = ?',
          [groupData.ownerId, result.insertId]
        );
      } else {
        // 如果不存在关联，创建新关联
        await connection.query(
          'INSERT INTO member_groups (member_id, group_id, is_owner) VALUES (?, ?, 1)',
          [groupData.ownerId, result.insertId]
        );
      }
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
 * 更新群组信息
 * @param {Object} groupData - 群组数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(groupData) {
  if (!groupData || !groupData.id) {
    throw new Error('缺少必要的群组信息');
  }

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

      // 更新旧群主在关联表中的状态
      if (currentGroup[0].owner_id) {
        // 查找旧群主的关联记录
        const [oldOwnerRelation] = await connection.query(
          'SELECT id FROM member_groups WHERE member_id = ? AND group_id = ?',
          [currentGroup[0].owner_id, groupData.id]
        );
        
        if (oldOwnerRelation.length > 0) {
          // 如果存在关联，更新为非群主
          await connection.query(
            'UPDATE member_groups SET is_owner = 0 WHERE member_id = ? AND group_id = ?',
            [currentGroup[0].owner_id, groupData.id]
          );
        }
      }

      // 处理新群主在关联表中的状态
      // 查找新群主的关联记录
      const [newOwnerRelation] = await connection.query(
        'SELECT id FROM member_groups WHERE member_id = ? AND group_id = ?',
        [groupData.ownerId, groupData.id]
      );
      
      if (newOwnerRelation.length > 0) {
        // 如果存在关联，更新为群主
        await connection.query(
          'UPDATE member_groups SET is_owner = 1 WHERE member_id = ? AND group_id = ?',
          [groupData.ownerId, groupData.id]
        );
      } else {
        // 如果不存在关联，创建新关联
        await connection.query(
          'INSERT INTO member_groups (member_id, group_id, is_owner) VALUES (?, ?, 1)',
          [groupData.ownerId, groupData.id]
        );
      }
    }
    
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
    // 移除手动更新member_count的部分，使用同步脚本来更新实际的成员数量

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
      'SELECT COUNT(*) as count FROM member_groups WHERE group_id = ?',
      [id]
    );

    if (members[0].count > 0) {
      throw new Error('该群组下存在关联会员，无法删除');
    }

    // 更新群主的群主标识（通过member_groups表）
    if (group[0].owner_id) {
      await connection.query(
        'DELETE FROM member_groups WHERE member_id = ? AND group_id = ?',
        [group[0].owner_id, id]
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

/**
 * 获取会员作为群主的群组列表
 * @param {number} memberId - 会员ID
 * @returns {Promise<Array>} 群组列表
 */
async function getOwnedByMember(memberId) {
  try {
    const query = `
      SELECT g.*, 
             m.member_nickname as owner_name,
             (SELECT COUNT(*) FROM member_groups mg WHERE mg.group_id = g.id) as member_count
      FROM \`groups\` g 
      LEFT JOIN members m ON g.owner_id = m.id
      WHERE g.owner_id = ?
      ORDER BY g.create_time DESC
    `;
    
    const [rows] = await pool.query(query, [memberId]);
    
    return rows.map(formatGroup);
  } catch (error) {
    logger.error(`获取会员作为群主的群组列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取系统配置的最大群成员数
 * @returns {Promise<number>} 最大群成员数
 */
async function getMaxGroupMembers() {
  try {
    const [rows] = await pool.query(
      'SELECT config_value FROM system_config WHERE config_key = "max_group_members"'
    );
    
    if (rows.length > 0) {
      return parseInt(rows[0].config_value, 10);
    }
    // 默认值
    return 200;
  } catch (error) {
    logger.error(`获取最大群成员数失败: ${error.message}`);
    // 出错时返回默认值
    return 200;
  }
}

/**
 * 获取群主收益率
 * @returns {Promise<number>} 群主收益率（0-1之间的小数）
 */
async function getGroupOwnerCommissionRate() {
  try {
    const [rows] = await pool.query(
      'SELECT config_value FROM system_config WHERE config_key = "group_owner_commission_rate"'
    );
    
    if (rows.length > 0) {
      return parseFloat(rows[0].config_value);
    }
    // 默认值
    return 0.1;
  } catch (error) {
    logger.error(`获取群主收益率失败: ${error.message}`);
    // 出错时返回默认值
    return 0.1;
  }
}

/**
 * 检查群组是否已满
 * @param {number} groupId - 群组ID
 * @returns {Promise<{isFull: boolean, currentMembers: number, maxMembers: number}>} 是否已满及相关数据
 */
async function checkGroupLimit(groupId) {
  try {
    // 获取当前群成员数
    const [currentCountResult] = await pool.query(
      'SELECT COUNT(*) as count FROM member_groups WHERE group_id = ?',
      [groupId]
    );
    
    const currentMembers = currentCountResult[0].count;
    
    // 获取系统设置的最大群成员数
    const maxMembers = await getMaxGroupMembers();
    
    return {
      isFull: currentMembers >= maxMembers,
      currentMembers,
      maxMembers
    };
  } catch (error) {
    logger.error(`检查群组限制失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getList,
  getById,
  create,
  update,
  remove,
  getOwnedByMember,
  getMaxGroupMembers,
  getGroupOwnerCommissionRate,
  checkGroupLimit
}; 