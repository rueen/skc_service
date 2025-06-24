/**
 * 账户模型
 * 处理账户相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');

/**
 * 格式化账户信息
 * @param {Object} account - 账户信息
 * @returns {Object} 格式化后的账户信息
 */
function formatAccount(account) {
  if (!account) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedAccount = convertToCamelCase({
    ...account,
    createTime: formatDateTime(account.create_time),
    updateTime: formatDateTime(account.update_time),
    submitTime: formatDateTime(account.submit_time),
    auditTime: formatDateTime(account.audit_time),
    memberCreateTime: formatDateTime(account.member_create_time)
  });
  return formattedAccount;
}

async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = '1=1';
    const queryParams = [];
    
    if (filters.memberId) {
      whereClause += ' AND a.member_id = ?';
      queryParams.push(filters.memberId);
    }
    
    if (filters.channelId) {
      whereClause += ' AND a.channel_id = ?';
      queryParams.push(filters.channelId);
    }
    
    if (filters.accountAuditStatus) {
      whereClause += ' AND a.account_audit_status = ?';
      queryParams.push(filters.accountAuditStatus);
    }
    
    if (filters.account) {
      whereClause += ' AND a.account LIKE ?';
      queryParams.push(`%${filters.account}%`);
    }
    
    // 添加对 keyword 的支持，搜索 account 和 uid 字段
    if (filters.keyword) {
      whereClause += ' AND (a.account LIKE ? OR a.uid LIKE ?)';
      queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    
    if (filters.groupId) {
      whereClause += ' AND EXISTS (SELECT 1 FROM member_groups mg WHERE mg.member_id = a.member_id AND mg.group_id = ?)';
      queryParams.push(filters.groupId);
    }
    
    if (filters.waiterId != null) {
      if (filters.waiterId == 0) {
        whereClause += ' AND a.waiter_id IS NULL';
      } else {
        whereClause += ' AND a.waiter_id = ?';
        queryParams.push(filters.waiterId);
      }
    }
    
    if (filters.submitStartTime) {
      whereClause += ' AND a.submit_time >= ?';
      queryParams.push(filters.submitStartTime);
    }
    
    if (filters.submitEndTime) {
      whereClause += ' AND a.submit_time <= ?';
      queryParams.push(filters.submitEndTime);
    }
    
    // 构建查询语句
    let query = `
      SELECT a.*, 
             m.nickname as member_nickname,
             m.account as member_account,
             m.create_time as member_create_time,
             c.name as channel_name,
             c.icon as channel_icon,
             c.custom_fields as channel_custom_fields,
             w.username as waiter_name
      FROM accounts a
      LEFT JOIN members m ON a.member_id = m.id
      LEFT JOIN channels c ON a.channel_id = c.id
      LEFT JOIN waiters w ON a.waiter_id = w.id
      WHERE ${whereClause}
      ORDER BY a.submit_time DESC
    `;
    
    // 根据是否为导出模式决定是否使用分页
    if (!filters.exportMode) {
      query += ' LIMIT ? OFFSET ?';
      queryParams.push(parseInt(pageSize, 10), offset);
    }
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM accounts a
      WHERE ${whereClause}
    `;
    
    const [countRows] = await pool.query(countQuery, filters.exportMode ? queryParams : queryParams.slice(0, -2));
    const total = countRows[0].total;
    
    // 处理渠道自定义字段
    const formattedRows = rows.map(row => {
      const formattedAccount = formatAccount(row);
      
      // 处理渠道自定义字段
      if (row.channel_custom_fields) {
        try {
          formattedAccount.channelCustomFields = typeof row.channel_custom_fields === 'object' 
            ? row.channel_custom_fields 
            : JSON.parse(row.channel_custom_fields);
        } catch (e) {
          formattedAccount.channelCustomFields = [];
        }
      } else {
        formattedAccount.channelCustomFields = [];
      }
      
      return formattedAccount;
    });
    
    // 获取相关会员的群组信息
    if (formattedRows.length > 0) {
      // 获取相关会员的群组信息
      const memberIds = [...new Set(formattedRows.map(account => account.memberId))].filter(Boolean);
      
      // 查询会员群组信息（仅当有会员ID时）
      const memberGroupsMap = {};
      if (memberIds.length > 0) {
        // 使用 member_groups 关联表查询
        const placeholders = memberIds.map(() => '?').join(',');
        const [memberGroups] = await pool.query(`
          SELECT mg.member_id, mg.group_id, mg.is_owner, mg.join_time,
                 g.*
          FROM member_groups mg
          JOIN \`groups\` g ON mg.group_id = g.id
          WHERE mg.member_id IN (${placeholders})
        `, memberIds);
        
        // 整理群组信息到每个会员下的groups数组中
        memberGroups.forEach(mg => {
          if (!memberGroupsMap[mg.member_id]) {
            memberGroupsMap[mg.member_id] = [];
          }
          
          memberGroupsMap[mg.member_id].push({
            id: mg.id,
            groupId: mg.group_id,
            groupName: mg.group_name,
            groupLink: mg.group_link,
            ownerId: mg.owner_id,
            isOwner: Boolean(mg.is_owner),
            joinTime: formatDateTime(mg.join_time),
            createTime: formatDateTime(mg.create_time),
            updateTime: formatDateTime(mg.update_time)
          });
        });
      }
      
      // 扩展账号信息，添加groups数组字段
      formattedRows.forEach(account => {
        account.groups = memberGroupsMap[account.memberId] || [];
      });
    }
    
    return {
      list: formattedRows,
      pagination: {
        total,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10)
      }
    };
  } catch (error) {
    logger.error(`获取账户列表失败: ${error.message}`);
    throw error;
  }
};

/**
 * 根据会员ID获取账户列表
 * @param {number} memberId - 会员ID
 * @returns {Promise<Array>} 账户列表
 */
async function getByMemberId(memberId) {
  try {
    const query = `
      SELECT a.*, 
         c.name as channel_name,
         c.icon as channel_icon
      FROM accounts a
      LEFT JOIN channels c ON a.channel_id = c.id
      WHERE a.member_id = ?
      ORDER BY a.channel_id
    `;
    
    const [rows] = await pool.query(query, [memberId]);
    
    // 格式化结果
    return rows.map(formatAccount);
  } catch (error) {
    logger.error(`根据会员ID获取账户列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据会员ID和渠道ID获取账号
 * @param {number} memberId - 会员ID
 * @param {number} channelId - 渠道ID
 * @returns {Promise<Object>} 账号信息
 */
async function getByMemberAndChannel(memberId, channelId) {
  try {
    const query = `
      SELECT a.*,
             c.name as channel_name,
             c.icon as channel_icon
      FROM accounts a
      LEFT JOIN channels c ON a.channel_id = c.id
      WHERE a.member_id = ? AND a.channel_id = ?
      LIMIT 1
    `;
    
    const [rows] = await pool.query(query, [memberId, channelId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    // 格式化结果
    return formatAccount(rows[0]);
  } catch (error) {
    logger.error(`根据会员ID和渠道ID获取账号失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建账户
 * @param {Object} accountData - 账户数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(accountData) {
  try {
    // 检查 UID 唯一性（如果提供了 UID）
    if (accountData.uid) {
      const [existingUid] = await pool.query(
        'SELECT id FROM accounts WHERE uid = ?',
        [accountData.uid]
      );
      
      if (existingUid.length > 0) {
        throw new Error('该账号已被使用，禁止重复绑定');
      }
    }
    
    // 准备数据
    const data = {
      member_id: accountData.memberId,
      channel_id: accountData.channelId,
      account: accountData.account,
      uid: accountData.uid || null,
      home_url: accountData.homeUrl || null,
      fans_count: accountData.fansCount || 0,
      friends_count: accountData.friendsCount || 0,
      posts_count: accountData.postsCount || 0,
      account_audit_status: accountData.accountAuditStatus || 'pending',
      submit_time: new Date()
    };
    
    // 执行插入
    const [result] = await pool.query(
      'INSERT INTO accounts SET ?',
      [data]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('创建账户失败');
    }
    
    // 获取新创建的账户信息
    const [accounts] = await pool.query(
      'SELECT * FROM accounts WHERE id = ?',
      [result.insertId]
    );
    
    // 格式化结果
    return formatAccount(accounts[0]);
  } catch (error) {
    logger.error(`创建账户失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新账户信息
 * @param {Object} accountData - 账户数据
 * @returns {Promise<Object>} 更新结果
 */
async function update(accountData) {
  try {
    const id = accountData.id;
    
    // 检查账号是否存在
    const [existingAccount] = await pool.query(
      'SELECT * FROM accounts WHERE id = ?',
      [id]
    );
    
    if (existingAccount.length === 0) {
      throw new Error('账号不存在');
    }
    
    // 检查UID唯一性（如果提供了UID且不同于原值）
    if (accountData.uid !== undefined && accountData.uid !== existingAccount[0].uid) {
      const [existingUid] = await pool.query(
        'SELECT id FROM accounts WHERE uid = ? AND id != ?',
        [accountData.uid, id]
      );
      
      if (existingUid.length > 0) {
        throw new Error('该账号已被使用，禁止重复绑定');
      }
    }
    
    // 准备更新数据
    const updateData = {};
    
    // 只更新提供的字段
    if (accountData.account !== undefined) updateData.account = accountData.account;
    if (accountData.uid !== undefined) updateData.uid = accountData.uid;
    if (accountData.homeUrl !== undefined) updateData.home_url = accountData.homeUrl;
    if (accountData.fansCount !== undefined) updateData.fans_count = parseInt(accountData.fansCount, 10);
    if (accountData.friendsCount !== undefined) updateData.friends_count = parseInt(accountData.friendsCount, 10);
    if (accountData.postsCount !== undefined) updateData.posts_count = parseInt(accountData.postsCount, 10);
    if (accountData.accountAuditStatus !== undefined) updateData.account_audit_status = accountData.accountAuditStatus;
    if (accountData.rejectReason !== undefined) updateData.reject_reason = accountData.rejectReason;
    if (accountData.waiterId !== undefined) updateData.waiter_id = accountData.waiterId;
    
    // 如果有更新字段，才执行更新操作
    if (Object.keys(updateData).length > 0) {
      // 更新提交时间
      updateData.submit_time = new Date();
      
      // 执行更新
      const [result] = await pool.query(
        'UPDATE accounts SET ? WHERE id = ?',
        [updateData, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('更新账户失败');
      }
    }
    
    // 返回更新结果
    return { success: true, id };
  } catch (error) {
    logger.error(`更新账户失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除账户
 * @param {number} id - 账户ID
 * @returns {Promise<Object>} 删除结果
 */
async function remove(id) {
  try {
    const query = `
      DELETE FROM accounts
      WHERE id = ?
    `;
    
    const [result] = await pool.query(query, [id]);
    
    if (result.affectedRows === 0) {
      throw new Error('删除账户失败');
    }
    
    return {
      success: true,
      message: '账户删除成功'
    };
  } catch (error) {
    logger.error(`删除账户失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量审核通过账号
 * @param {Array<number>} ids - 账号ID数组
 * @param {number} waiterId - 审核员ID
 * @returns {Promise<Object>} 操作结果
 */
async function batchApprove(ids, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 先查询状态为pending的账号并加排他锁(X锁)，防止并发问题
    const [pendingAccounts] = await connection.query(
      `SELECT 
        id
      FROM accounts 
      WHERE id IN (?) AND account_audit_status = 'pending'
      FOR UPDATE`,
      [ids]
    );
    
    // 直接获取符合条件的账号ID
    const pendingIds = pendingAccounts.map(account => account.id);
    
    if (pendingIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    // 更新账号状态为已通过，只更新pending状态的账号
    const [result] = await connection.query(
      `UPDATE accounts 
       SET account_audit_status = 'approved', waiter_id = ?, audit_time = NOW() 
       WHERE id IN (?) AND account_audit_status = 'pending'`,
      [waiterId, pendingIds]
    );
    
    await connection.commit();
    
    return {
      success: true,
      updatedCount: result.affectedRows
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`批量审核通过账号失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 批量拒绝账号
 * @param {Array<number>} ids - 账号ID数组
 * @param {string} reason - 拒绝原因
 * @param {number} waiterId - 审核员ID
 * @returns {Promise<Object>} 操作结果
 */
async function batchReject(ids, reason, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 先查询状态为pending的账号并加排他锁(X锁)，防止并发问题
    const [pendingAccounts] = await connection.query(
      `SELECT 
        id
      FROM accounts 
      WHERE id IN (?) AND account_audit_status = 'pending'
      FOR UPDATE`,
      [ids]
    );
    
    // 直接获取符合条件的账号ID
    const pendingIds = pendingAccounts.map(account => account.id);
    
    if (pendingIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    // 更新账号状态为已拒绝，只更新pending状态的账号
    const [result] = await connection.query(
      `UPDATE accounts 
       SET account_audit_status = 'rejected', reject_reason = ?, waiter_id = ?, audit_time = NOW() 
       WHERE id IN (?) AND account_audit_status = 'pending'`,
      [reason, waiterId, pendingIds]
    );
    
    await connection.commit();
    
    return {
      success: true,
      updatedCount: result.affectedRows
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`批量拒绝账号失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 根据ID获取账号详情
 * @param {number} id - 账号ID
 * @returns {Promise<Object>} 账号详情
 */
async function getById(id) {
  try {
    const query = `
      SELECT a.*, 
             c.name as channel_name,
             c.icon as channel_icon,
             c.custom_fields as channel_custom_fields
      FROM accounts a
      LEFT JOIN channels c ON a.channel_id = c.id
      WHERE a.id = ?
      LIMIT 1
    `;
    
    const [rows] = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    // 格式化账号信息
    const formattedAccount = formatAccount(rows[0]);
    
    // 处理渠道自定义字段
    if (rows[0].channel_custom_fields) {
      try {
        formattedAccount.channelCustomFields = typeof rows[0].channel_custom_fields === 'object' 
          ? rows[0].channel_custom_fields 
          : JSON.parse(rows[0].channel_custom_fields);
      } catch (e) {
        formattedAccount.channelCustomFields = [];
      }
    } else {
      formattedAccount.channelCustomFields = [];
    }
    
    return formattedAccount;
  } catch (error) {
    logger.error(`根据ID获取账号详情失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getList,
  formatAccount,
  getByMemberId,
  getByMemberAndChannel,
  create,
  update,
  remove,
  batchApprove,
  batchReject,
  getById
}; 