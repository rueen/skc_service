/**
 * 群组模型
 * 处理群组相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化群组信息
 * @param {Object} group - 群组信息
 * @returns {Object} 格式化后的群组信息
 */
function formatGroup(group) {
  if (!group) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedGroup = convertToCamelCase({
    ...group,
    createTime: formatDateTime(group.create_time),
    updateTime: formatDateTime(group.update_time),
    joinTime: formatDateTime(group.join_time)
  });
  
  return formattedGroup;
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
             m.nickname as owner_name,
             (SELECT COUNT(*) FROM member_groups mg WHERE mg.group_id = g.id) as member_count
      FROM \`groups\` g 
      LEFT JOIN members m ON g.owner_id = m.id
    `;
    
    // 如果有memberId筛选，需要通过member_groups表关联
    if (filters.memberId) {
      query = `
        SELECT g.*, 
               m.nickname as owner_name,
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
      conditions.push('(g.group_name LIKE ? OR m.nickname LIKE ? OR g.group_link LIKE ?)');
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
              m.nickname as owner_name,
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

    // 如果要设置新群主（ownerId不是undefined）
    if (groupData.ownerId !== undefined) {
      const currentOwnerId = currentGroup[0].owner_id;
      
      // 如果要删除群主（ownerId为null）
      if (groupData.ownerId === null && currentOwnerId) {
        // 将旧群主在关联表中的状态更新为非群主
        await connection.query(
          'UPDATE member_groups SET is_owner = 0 WHERE member_id = ? AND group_id = ?',
          [currentOwnerId, groupData.id]
        );
      } 
      // 如果要设置新群主（ownerId不为null）
      else if (groupData.ownerId !== null && currentOwnerId !== groupData.ownerId) {
        // 检查新群主是否存在
        const [newOwner] = await connection.query(
          'SELECT id FROM members WHERE id = ?',
          [groupData.ownerId]
        );

        if (newOwner.length === 0) {
          throw new Error('新群主不存在');
        }

        // 更新旧群主在关联表中的状态
        if (currentOwnerId) {
          // 查找旧群主的关联记录
          const [oldOwnerRelation] = await connection.query(
            'SELECT id FROM member_groups WHERE member_id = ? AND group_id = ?',
            [currentOwnerId, groupData.id]
          );
          
          if (oldOwnerRelation.length > 0) {
            // 如果存在关联，更新为非群主
            await connection.query(
              'UPDATE member_groups SET is_owner = 0 WHERE member_id = ? AND group_id = ?',
              [currentOwnerId, groupData.id]
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
    if (groupData.ownerId !== undefined) {
      updateFields.push('owner_id = ?');
      params.push(groupData.ownerId);
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

/**
 * 获取会员的第一个群组ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 包含群组ID的对象，如果没有群组则返回null
 */
async function getMemberFirstGroup(memberId) {
  try {
    const [rows] = await pool.query(
      `SELECT mg.group_id 
       FROM member_groups mg 
       WHERE mg.member_id = ? 
       ORDER BY mg.join_time ASC, mg.id ASC 
       LIMIT 1`,
      [memberId]
    );
    
    if (rows.length > 0) {
      return { groupId: rows[0].group_id };
    }
    return null;
  } catch (error) {
    logger.error(`获取会员第一个群组失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员所属的群组列表
 * @param {number} memberId - 会员ID
 * @returns {Promise<Array>} 群组列表
 */
async function getMemberGroups(memberId) {
  try {
    const [rows] = await pool.query(
      `SELECT g.*, mg.is_owner, 
              (SELECT COUNT(*) FROM member_groups WHERE group_id = g.id) as member_count
       FROM member_groups mg
       JOIN \`groups\` g ON mg.group_id = g.id
       WHERE mg.member_id = ?`,
      [memberId]
    );

    // 获取作为群主的群组的收益统计
    const result = [];
    for (const row of rows) {
      const group = formatGroup(row);
      group.isGroupOwner = row.is_owner === 1;

      // 如果是群主，计算该群的总收益
      if (group.isGroupOwner) {
        const [earnings] = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) as total_earnings
           FROM bills
           WHERE bill_type = 'group_owner_commission'
           AND related_group_id = ?`,
          [row.id]
        );
        group.totalEarnings = parseFloat(earnings[0].total_earnings || 0).toFixed(2);
      }
      
      result.push(group);
    }
    
    return result;
  } catch (error) {
    logger.error(`获取会员群组列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员作为群主的统计信息
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 统计信息
 */
async function getOwnerGroupStats(memberId) {
  try {
    // 获取会员作为群主的群组数量
    const [groupCount] = await pool.query(
      `SELECT COUNT(*) as count
       FROM member_groups mg
       JOIN \`groups\` g ON mg.group_id = g.id
       WHERE mg.member_id = ? AND mg.is_owner = 1`,
      [memberId]
    );
    
    // 获取所有群成员数
    const [memberCount] = await pool.query(
      `SELECT COUNT(*) as count
       FROM member_groups mg
       WHERE mg.group_id IN (
         SELECT g.id
         FROM member_groups mg2
         JOIN \`groups\` g ON mg2.group_id = g.id
         WHERE mg2.member_id = ? AND mg2.is_owner = 1
       )`,
      [memberId]
    );
    
    // 获取会员作为群主的总收益
    const [earnings] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_earnings
       FROM bills
       WHERE bill_type = 'group_owner_commission'
       AND member_id = ?`,
      [memberId]
    );
    
    // 获取为该群主带来收益的任务总数
    const [taskCount] = await pool.query(
      `SELECT COUNT(DISTINCT task_id) as count
       FROM bills
       WHERE bill_type = 'group_owner_commission'
       AND member_id = ?
       AND task_id IS NOT NULL`,
      [memberId]
    );
    
    return {
      groupCount: groupCount[0].count,
      memberCount: memberCount[0].count,
      totalCommission: parseFloat(earnings[0].total_earnings || 0).toFixed(2),
      taskCount: taskCount[0].count
    };
  } catch (error) {
    logger.error(`获取群主统计信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取群组成员列表
 * @param {number} groupId - 群组ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 群组成员列表和总数
 */
async function getGroupMembers(groupId, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    // 验证群组存在
    const group = await getById(groupId);
    if (!group) {
      throw new Error('群组不存在');
    }
    
    // 获取总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM member_groups mg
       WHERE mg.group_id = ?`,
      [groupId]
    );
    
    const total = countResult[0].total;
    
    // 获取成员列表
    const [rows] = await pool.query(
      `SELECT m.id, m.nickname, m.account, 
              m.avatar, mg.join_time, mg.is_owner
       FROM member_groups mg
       JOIN members m ON mg.member_id = m.id
       WHERE mg.group_id = ?
       ORDER BY mg.is_owner DESC, mg.join_time DESC
       LIMIT ? OFFSET ?`,
      [groupId, parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10)]
    );
    
    // 获取群主ID
    const [ownerResult] = await pool.query(
      `SELECT member_id FROM member_groups 
       WHERE group_id = ? AND is_owner = 1`,
      [groupId]
    );
    
    if (ownerResult.length === 0) {
      throw new Error('群组没有群主');
    }
    
    const ownerId = ownerResult[0].member_id;
    
    // 获取每个成员在该群组中完成的任务数和为群主贡献的收益
    const result = [];
    for (const member of rows) {
      // 获取会员在该群组中完成的任务数
      const [taskCount] = await pool.query(
        `SELECT COUNT(*) as count
         FROM submitted_tasks st
         WHERE st.member_id = ? 
         AND st.related_group_id = ?
         AND st.task_audit_status = 'approved'`,
        [member.id, groupId]
      );
      
      // 获取会员为群主贡献的收益（群主从该会员获得的佣金）
      const [earnings] = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_earnings
         FROM bills
         WHERE member_id = ?                   /* 群主ID */
         AND related_member_id = ?             /* 会员ID */
         AND related_group_id = ?              /* 群组ID */
         AND bill_type = 'group_owner_commission'
         AND settlement_status = 'success'`,
        [ownerId, member.id, groupId]
      );
      
      result.push({
        id: member.id,
        avatar: member.avatar,
        nickname: member.nickname,
        account: member.account,
        joinTime: formatDateTime(member.join_time),
        isGroupOwner: member.is_owner === 1,
        taskCount: taskCount[0].count,
        earnings: parseFloat(earnings[0].total_earnings || 0).toFixed(2)
      });
    }
    
    return {
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      list: result
    };
  } catch (error) {
    logger.error(`获取群组成员列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查会员是否在指定群组列表中
 * @param {number} memberId - 会员ID
 * @param {Array<number>} groupIds - 群组ID数组
 * @returns {Promise<boolean>} 是否在指定群组中
 */
async function isMemberInGroups(memberId, groupIds) {
  try {
    if (!memberId || !groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return false;
    }
    
    // 查询会员是否在指定的群组列表中
    const placeholders = groupIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count 
       FROM member_groups 
       WHERE member_id = ? AND group_id IN (${placeholders})`,
      [memberId, ...groupIds]
    );
    
    return rows[0].count > 0;
  } catch (error) {
    logger.error(`检查会员是否在指定群组中失败: ${error.message}`);
    // 发生错误时默认返回false，以保证安全
    return false;
  }
}

/**
 * 获取为群主带来收益的任务列表
 * @param {number} memberId - 群主会员ID
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页条数
 * @param {string} options.startDate - 开始日期 (YYYY-MM-DD)
 * @param {string} options.endDate - 结束日期 (YYYY-MM-DD)
 * @returns {Promise<Object>} 任务列表和统计信息
 */
async function getOwnerCommissionTasks(memberId, options = {}) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE,
      startDate,
      endDate
    } = options;
    
    const offset = (page - 1) * pageSize;
    let whereClause = 'WHERE b.member_id = ? AND b.bill_type = ? AND b.task_id IS NOT NULL';
    const params = [memberId, 'group_owner_commission'];
    
    // 添加日期筛选
    if (startDate) {
      whereClause += ' AND DATE(b.create_time) >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND DATE(b.create_time) <= ?';
      params.push(endDate);
    }
    
    // 获取任务列表
    const query = `
      SELECT 
        t.id AS task_id,
        t.task_name,
        t.channel_id,
        c.name AS channel_name,
        t.reward,
        COUNT(DISTINCT b.related_member_id) AS participant_count,
        SUM(b.amount) AS commission,
        MAX(b.create_time) AS latest_commission_time
      FROM 
        bills b
        JOIN tasks t ON b.task_id = t.id
        LEFT JOIN channels c ON t.channel_id = c.id
      ${whereClause}
      GROUP BY 
        t.id
      ORDER BY 
        latest_commission_time DESC
      LIMIT ?, ?
    `;
    
    const [rows] = await pool.query(query, [...params, offset, parseInt(pageSize, 10)]);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) AS total
      FROM bills b
      JOIN tasks t ON b.task_id = t.id
      ${whereClause}
    `;
    
    const [countResult] = await pool.query(countQuery, params);
    const total = countResult[0].total;
    
    // 格式化结果
    const formattedList = rows.map(row => ({
      taskId: row.task_id,
      taskName: row.task_name,
      channelId: row.channel_id,
      channelName: row.channel_name,
      rewardAmount: parseFloat(row.reward || 0).toFixed(2),
      participantCount: row.participant_count,
      commission: parseFloat(row.commission || 0).toFixed(2),
      createTime: formatDateTime(row.latest_commission_time)
    }));
    
    return {
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      list: formattedList
    };
  } catch (error) {
    logger.error(`获取群主收益任务列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  formatGroup,
  getList,
  getById,
  create,
  update,
  remove,
  getMaxGroupMembers,
  getGroupOwnerCommissionRate,
  checkGroupLimit,
  getMemberFirstGroup,
  getMemberGroups,
  getOwnerGroupStats,
  getGroupMembers,
  isMemberInGroups,
  getOwnerCommissionTasks
}; 