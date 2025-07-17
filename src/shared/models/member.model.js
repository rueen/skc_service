/**
 * 会员模型
 * 处理会员相关的数据库操作
 */
const { pool } = require('./db');
const crypto = require('crypto');
const billModel = require('./bill.model');
const { logger } = require('../config/logger.config');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');
const { BillType } = require('../config/enums');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');
const groupModel = require('./group.model');
const accountModel = require('./account.model');
const memberBalanceModel = require('./member-balance.model');
const taskStatsModel = require('./task-stats.model');

/**
 * 格式化会员信息
 * @param {Object} member - 会员信息
 * @returns {Object} 格式化后的会员信息
 */
function formatMember(member) {
  if (!member) return null;

  const formattedMember = convertToCamelCase({
    ...member,
    hasPassword: !!member.password,
    gender: member.gender !== undefined ? member.gender : 2, // 默认为保密
    createTime: formatDateTime(member.create_time),
    updateTime: formatDateTime(member.update_time),
  });
  
  return formattedMember;
}

/**
 * 生成邀请码
 * @returns {string} 生成的邀请码
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const codeLength = 6;
  let code = '';
  
  // 使用加密安全的随机数生成器
  const randomBytes = crypto.randomBytes(codeLength);
  
  for (let i = 0; i < codeLength; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    code += chars.charAt(randomIndex);
  }
  
  return code;
}

/**
 * 获取会员列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 会员列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let baseQuery = `
      SELECT m.*, 
        inv.nickname as inviter_nickname,
        inv.account as inviter_account
      FROM members m
      LEFT JOIN members inv ON m.inviter_id = inv.id
    `;
    
    let countQuery = `
      SELECT COUNT(DISTINCT m.id) as total 
      FROM members m
    `;
    
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.memberNickname) {
      conditions.push('m.nickname LIKE ?');
      queryParams.push(`%${filters.memberNickname}%`);
    }
    
    // 关键词搜索 - 同时搜索 account 和 nickname
    if (filters.keyword) {
      conditions.push('(m.nickname LIKE ? OR m.account LIKE ?)');
      queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    
    // 如果需要按群组筛选，使用子查询
    if (filters.groupId) {
      conditions.push('m.id IN (SELECT member_id FROM member_groups WHERE group_id = ?)');
      queryParams.push(filters.groupId);
    }
    
    // 邀请人筛选
    if (filters.inviterId) {
      conditions.push('m.inviter_id = ?');
      queryParams.push(filters.inviterId);
    }
    
    // 邀请人账号或昵称搜索
    if (filters.inviter) {
      conditions.push('(m.inviter_id IN (SELECT id FROM members WHERE account LIKE ? OR nickname LIKE ?))');
      queryParams.push(`%${filters.inviter}%`, `%${filters.inviter}%`);
    }
    
    // 创建开始时间筛选
    if (filters.createStartTime) {
      conditions.push('m.create_time >= ?');
      queryParams.push(filters.createStartTime);
    }
    
    // 创建结束时间筛选
    if (filters.createEndTime) {
      conditions.push('m.create_time <= ?');
      queryParams.push(filters.createEndTime);
    }

    // 渠道筛选
    if (filters.channelId !== undefined) {
      conditions.push('m.id IN (SELECT member_id FROM accounts WHERE channel_id = ?)');
      queryParams.push(filters.channelId);
    }

    // 已完成任务次数筛选
    if (filters.completedTaskCount !== undefined) {
      conditions.push(`m.id IN (
        SELECT member_id 
        FROM submitted_tasks 
        WHERE task_audit_status = 'approved'
        GROUP BY member_id 
        HAVING COUNT(*) = ?
      )`);
      queryParams.push(filters.completedTaskCount);
    }

    // 组合查询条件
    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = ' WHERE ' + conditions.join(' AND ');
      baseQuery += whereClause;
      countQuery += whereClause;
    }

    // 添加排序
    baseQuery += ' ORDER BY m.create_time DESC';
    
    // 判断是否是导出模式，如果不是则添加分页
    if (!filters.exportMode) {
      baseQuery += ' LIMIT ? OFFSET ?';
      queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));
    }

    // 执行会员基础信息查询
    const [members] = await pool.query(baseQuery, queryParams);
    
    // 只有在非导出模式下才执行计数查询
    let total = 0;
    if (!filters.exportMode) {
      const countQueryParams = queryParams.slice(0, -2); // 去掉分页参数
      const [countResult] = await pool.query(countQuery, countQueryParams);
      total = countResult[0].total;
    } else {
      total = members.length;
    }
    
    if (members.length === 0) {
      return {
        list: [],
        total: 0,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10)
      };
    }
    
    // 获取会员IDs
    const memberIds = members.map(member => member.id);
    
    // 单独查询所有会员的群组关系
    const [memberGroups] = await pool.query(
      `SELECT mg.member_id, mg.group_id, mg.is_owner, mg.join_time,
              g.group_name, g.group_link
       FROM member_groups mg
       JOIN \`groups\` g ON mg.group_id = g.id
       WHERE mg.member_id IN (?)`,
      [memberIds]
    );
    
    // 按会员ID组织群组数据
    const groupsMap = {};
    memberGroups.forEach(group => {
      if (!groupsMap[group.member_id]) {
        groupsMap[group.member_id] = [];
      }
      
      groupsMap[group.member_id].push(groupModel.formatGroup(group));
    });
    
    // 获取每个会员的账号列表
    let accountsMap = {};
    
    if (memberIds.length > 0) {
      const [accounts] = await pool.query(
        `SELECT a.*, c.name as channel_name, c.icon as channel_icon
         FROM accounts a
         LEFT JOIN channels c ON a.channel_id = c.id
         WHERE a.member_id IN (?)`,
        [memberIds]
      );
      
      // 按会员ID分组账号
      accounts.forEach(account => {
        if (!accountsMap[account.member_id]) {
          accountsMap[account.member_id] = [];
        }
        accountsMap[account.member_id].push(accountModel.formatAccount(account));
      });
    }
    
    // 整合会员、群组和账号信息
    const formattedMembers = members.map(member => {
      // 使用成员基本信息格式化
      const formattedMember = formatMember(member);
      // 移除敏感信息
      delete formattedMember.password;
      
      // 添加群组信息数组
      formattedMember.groups = groupsMap[member.id] || [];
      
      // 添加账号列表
      formattedMember.accountList = accountsMap[member.id] || [];
      
      return formattedMember;
    });
    
    // 获取每个会员已完成任务的次数
    const completedTaskCountPromises = formattedMembers.map(async member => {
      const [rows] = await pool.query(
        `SELECT COUNT(*) as count 
         FROM submitted_tasks st
         WHERE st.member_id = ? 
         AND st.task_audit_status = 'approved'`,
        [member.id]
      );
      member.completedTaskCount = rows[0].count;
      return member;
    });
    
    // 等待所有任务计数查询完成
    await Promise.all(completedTaskCountPromises);

    // 统计所有满足筛选条件的会员的已审核通过账号总数
    const approvedQueryParams = filters.exportMode ? queryParams : queryParams.slice(0, -2); // 去掉分页参数
    const [approvedStats] = await pool.query(
      `SELECT COUNT(*) as totalApproved
       FROM accounts a
       JOIN members m ON a.member_id = m.id
       ${whereClause}
       AND a.account_audit_status = 'approved'`,
      approvedQueryParams
    );
    
    const totalApproved = approvedStats[0].totalApproved;

    return {
      list: formattedMembers,
      total: total,
      totalApproved,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取会员列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取会员详情
 * @param {number} id - 会员ID
 * @returns {Promise<Object|null>} 会员详情或null
 */
async function getById(id) {
  try {
    // 获取会员基本信息
    const [rows] = await pool.query(
      `SELECT m.*, inv.nickname as inviter_nickname
       FROM members m
       LEFT JOIN members inv ON m.inviter_id = inv.id
       WHERE m.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    // 获取会员的账号列表
    const [accounts] = await pool.query(
      `SELECT a.*, c.name as channel_name, c.icon as channel_icon
       FROM accounts a
       LEFT JOIN channels c ON a.channel_id = c.id
       WHERE a.member_id = ?`,
      [id]
    );
    
    // 获取会员的群组关系
    const [memberGroups] = await pool.query(
      `SELECT mg.group_id, mg.is_owner, 
              g.group_name, g.group_link
       FROM member_groups mg
       JOIN \`groups\` g ON mg.group_id = g.id
       WHERE mg.member_id = ?`,
      [id]
    );
    
    // 格式化会员信息
    const member = formatMember(rows[0]);
    
    // 添加群组数组
    member.groups = memberGroups.map(group => (groupModel.formatGroup(group)));
    
    // 添加账号列表
    member.accountList = accounts.map(account => (accountModel.formatAccount(account)));
    
    return member;
  } catch (error) {
    logger.error(`获取会员详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据账号获取会员
 * @param {string} account - 会员账号
 * @returns {Promise<Object|null>} 会员信息
 */
async function getByAccount(account) {
  try {
    // 获取会员基本信息
    const [rows] = await pool.query(
      `SELECT m.*, inv.nickname as inviter_nickname
       FROM members m
       LEFT JOIN members inv ON m.inviter_id = inv.id
       WHERE m.account = ?`,
      [account]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    // 获取会员的群组关系
    const memberId = rows[0].id;
    const [memberGroups] = await pool.query(
      `SELECT mg.group_id, mg.is_owner, 
              g.group_name, g.group_link
       FROM member_groups mg
       JOIN \`groups\` g ON mg.group_id = g.id
       WHERE mg.member_id = ?`,
      [memberId]
    );
    
    // 格式化会员信息
    const member = formatMember(rows[0]);
    
    // 添加群组数组
    member.groups = memberGroups.map(group => (groupModel.formatGroup(group)));
    
    return member;
  } catch (error) {
    logger.error(`根据账号获取会员失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建会员
 * @param {Object} memberData - 会员数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(memberData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查会员账号是否已存在
    const [existingAccount] = await connection.query(
      'SELECT id FROM members WHERE account = ?',
      [memberData.memberAccount]
    );
    
    if (existingAccount.length > 0) {
      throw new Error('会员账号已存在');
    }
    
    // 检查群组是否存在（已在controller中验证，这里不再重复检查）
    
    // 检查邀请人是否存在
    if (memberData.inviterId) {
      const [inviter] = await connection.query(
        'SELECT id FROM members WHERE id = ?',
        [memberData.inviterId]
      );
      
      if (inviter.length === 0) {
        throw new Error('邀请人不存在');
      }
    }
    
    // 生成唯一邀请码
    let inviteCode;
    let isUniqueCode = false;
    
    while (!isUniqueCode) {
      inviteCode = generateInviteCode();
      const [existingCode] = await connection.query(
        'SELECT id FROM members WHERE invite_code = ?',
        [inviteCode]
      );
      
      if (existingCode.length === 0) {
        isUniqueCode = true;
      }
    }
    
    // 创建会员
    const [result] = await connection.query(
      `INSERT INTO members 
       (nickname, account, password, inviter_id, occupation, invite_code, phone, area_code, email, avatar, gender, telegram, register_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memberData.memberNickname,
        memberData.memberAccount,
        memberData.password || null,
        memberData.inviterId || null,
        memberData.occupation || null,
        inviteCode,
        memberData.phone || null,
        memberData.areaCode || null, // 默认为null
        memberData.email || null,
        memberData.avatar || null,
        memberData.gender !== undefined ? memberData.gender : 2, // 默认为保密
        memberData.telegram || null,
        memberData.registerSource || 'h5' // 默认为h5端注册
      ]
    );
    
    const memberId = result.insertId;
    
    // 如果指定了群组，创建会员-群组关联
    if (memberData.groupIds && memberData.groupIds.length > 0) {
      // 构建批量插入的参数
      const groupValues = [];
      
      for (const groupId of memberData.groupIds) {
        // 所有群组关系默认都不是群主
        groupValues.push([memberId, parseInt(groupId, 10), 0]);
      }
      
      if (groupValues.length > 0) {
        // 批量插入会员-群组关系
        await connection.query(
          `INSERT INTO member_groups 
           (member_id, group_id, is_owner)
           VALUES ?`,
          [groupValues]
        );
      }
    }
    
    await connection.commit();
    return { id: memberId, inviteCode };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建会员失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新会员
 * @param {Object} memberData - 会员数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(memberData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查会员是否存在
    const [existingMember] = await connection.query(
      'SELECT id FROM members WHERE id = ?',
      [memberData.id]
    );
    
    if (existingMember.length === 0) {
      throw new Error('会员不存在');
    }
    
    // 检查会员账号是否已被其他会员使用
    if (memberData.memberAccount) {
      const [existingAccount] = await connection.query(
        'SELECT id FROM members WHERE account = ? AND id != ?',
        [memberData.memberAccount, memberData.id]
      );
      
      if (existingAccount.length > 0) {
        throw new Error('会员账号已被其他会员使用');
      }
    }
    
    // 检查邀请人是否存在
    if (memberData.inviterId) {
      const [inviter] = await connection.query(
        'SELECT id FROM members WHERE id = ?',
        [memberData.inviterId]
      );
      
      if (inviter.length === 0) {
        throw new Error('邀请人不存在');
      }
    }
    
    // 构建更新语句
    const updateFields = [];
    const params = [];
    
    if (memberData.memberNickname !== undefined) {
      updateFields.push('nickname = ?');
      params.push(memberData.memberNickname);
    }
    
    if (memberData.memberAccount !== undefined) {
      updateFields.push('account = ?');
      params.push(memberData.memberAccount);
    }
    
    if (memberData.password !== undefined) {
      updateFields.push('password = ?');
      params.push(memberData.password);
      
      // 密码变更时，更新密码修改时间字段
      updateFields.push('password_changed_time = NOW()');
    }
    
    if (memberData.inviterId !== undefined) {
      updateFields.push('inviter_id = ?');
      params.push(memberData.inviterId);
    }
    
    if (memberData.occupation !== undefined) {
      updateFields.push('occupation = ?');
      params.push(memberData.occupation);
    }
    
    if (memberData.phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(memberData.phone);
    }
    
    if (memberData.areaCode !== undefined) {
      updateFields.push('area_code = ?');
      params.push(memberData.areaCode);
    }
    
    if (memberData.email !== undefined) {
      updateFields.push('email = ?');
      params.push(memberData.email);
    }
    
    if (memberData.avatar !== undefined) {
      updateFields.push('avatar = ?');
      params.push(memberData.avatar);
    }
    
    if (memberData.gender !== undefined) {
      updateFields.push('gender = ?');
      params.push(memberData.gender);
    }
    
    if (memberData.telegram !== undefined) {
      updateFields.push('telegram = ?');
      params.push(memberData.telegram);
    }
    
    if (memberData.isNew !== undefined) {
      updateFields.push('is_new = ?');
      params.push(memberData.isNew);
    }
    
    if (memberData.registerSource !== undefined) {
      updateFields.push('register_source = ?');
      params.push(memberData.registerSource);
    }
    
    if (updateFields.length > 0) {
      params.push(memberData.id);
      
      // 更新会员信息
      await connection.query(
        `UPDATE members SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    // 处理群组关系更新
    if (memberData.groupIds !== undefined) {
      // 1. 获取会员当前的所有群组关系
      const [currentGroups] = await connection.query(
        'SELECT group_id, is_owner FROM member_groups WHERE member_id = ?',
        [memberData.id]
      );
      
      // 将当前的群组ID和群主状态放入Map便于查询
      const currentGroupMap = new Map();
      currentGroups.forEach(group => {
        currentGroupMap.set(group.group_id, group.is_owner);
      });
      
      // 将传入的groupIds转为Set，便于快速查找
      const newGroupIds = new Set();
      if (memberData.groupIds && memberData.groupIds.length > 0) {
        memberData.groupIds.forEach(groupId => {
          newGroupIds.add(parseInt(groupId, 10));
        });
      }
      
      // 2. 找出需要删除的群组关系（当前有但新列表没有的）
      const groupsToDelete = [];
      const ownerGroupsToUpdate = [];
      currentGroupMap.forEach((isOwner, groupId) => {
        if (!newGroupIds.has(groupId)) {
          groupsToDelete.push(groupId);
          // 如果是群主，需要更新groups表的owner_id
          if (isOwner === 1) {
            ownerGroupsToUpdate.push(groupId);
          }
        }
      });
      
      // 3. 找出需要新增的群组关系（新列表有但当前没有的）
      const groupsToAdd = [];
      newGroupIds.forEach(groupId => {
        if (!currentGroupMap.has(groupId)) {
          groupsToAdd.push(groupId);
        }
      });
      
      // 删除不再需要的群组关系
      if (groupsToDelete.length > 0) {
        // 先更新groups表中的owner_id字段
        if (ownerGroupsToUpdate.length > 0) {
          const ownerPlaceholders = ownerGroupsToUpdate.map(() => '?').join(',');
          await connection.query(
            `UPDATE \`groups\` SET owner_id = NULL 
             WHERE owner_id = ? AND id IN (${ownerPlaceholders})`,
            [memberData.id, ...ownerGroupsToUpdate]
          );
        }
        
        // 删除会员-群组关系
        const placeholders = groupsToDelete.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM member_groups WHERE member_id = ? AND group_id IN (${placeholders})`,
          [memberData.id, ...groupsToDelete]
        );
      }
      
      // 添加新的群组关系
      if (groupsToAdd.length > 0) {
        const groupValues = [];
        for (const groupId of groupsToAdd) {
          // 新添加的群组关系默认不是群主
          groupValues.push([memberData.id, groupId, 0]);
        }
        
        if (groupValues.length > 0) {
          await connection.query(
            `INSERT INTO member_groups 
             (member_id, group_id, is_owner)
             VALUES ?`,
            [groupValues]
          );
        }
      }
    }
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新会员失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除会员
 * @param {number} id - 会员ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查会员是否存在
    const [member] = await connection.query(
      'SELECT id FROM members WHERE id = ?',
      [id]
    );
    
    if (member.length === 0) {
      throw new Error('会员不存在');
    }
    
    // 获取会员当前所在的群组和群主状态
    const [memberGroup] = await connection.query(
      `SELECT mg.group_id, mg.is_owner
       FROM member_groups mg
       WHERE mg.member_id = ?`,
      [id]
    );
    
    const isGroupOwner = memberGroup.length > 0 ? memberGroup[0].is_owner === 1 : false;
    const groupId = memberGroup.length > 0 ? memberGroup[0].group_id : null;
    
    // 检查是否有关联的账号
    const [accounts] = await connection.query(
      'SELECT COUNT(*) as count FROM accounts WHERE member_id = ?',
      [id]
    );
    
    if (accounts[0].count > 0) {
      throw new Error('该会员下存在关联账号，无法删除');
    }
    
    // 检查是否有关联的已提交任务
    const [tasks] = await connection.query(
      'SELECT COUNT(*) as count FROM submitted_tasks WHERE member_id = ?',
      [id]
    );
    
    if (tasks[0].count > 0) {
      throw new Error('该会员下存在关联任务，无法删除');
    }
    
    // 检查是否有关联的账单
    const [bills] = await connection.query(
      'SELECT COUNT(*) as count FROM bills WHERE member_id = ?',
      [id]
    );
    
    if (bills[0].count > 0) {
      throw new Error('该会员下存在关联账单，无法删除');
    }
    
    // 如果是群主，清除群组的群主ID
    if (isGroupOwner && groupId) {
      await connection.query(
        'UPDATE `groups` SET owner_id = NULL WHERE owner_id = ?',
        [id]
      );
    }
    
    // 删除会员-群组关联
    await connection.query(
      'DELETE FROM member_groups WHERE member_id = ?',
      [id]
    );
    
    // 删除会员
    const [result] = await connection.query(
      'DELETE FROM members WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除会员失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 检查群组是否存在
 * @param {number} groupId - 群组ID
 * @returns {Promise<boolean>} 群组是否存在
 */
async function checkGroupExists(groupId) {
  try {
    if (!groupId) return false;
    
    const [rows] = await pool.query(
      'SELECT id FROM `groups` WHERE id = ?',
      [groupId]
    );
    
    return rows.length > 0;
  } catch (error) {
    logger.error(`检查群组存在性失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新会员余额
 * @param {number} memberId - 会员ID
 * @param {number} amount - 变动金额（正数增加，负数减少）
 * @param {string} [remark] - 变动备注
 * @returns {Promise<boolean>} 更新是否成功
 */
async function updateMemberBalance(memberId, amount, remark = '') {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查会员是否存在并获取当前余额
    const [member] = await connection.query(
      'SELECT id FROM members WHERE id = ?',
      [memberId]
    );
    
    if (member.length === 0) {
      throw new Error('会员不存在');
    }
    
    // 确保金额是数字类型
    const changeAmount = parseFloat(amount);
    
    // 使用 memberBalanceModel 统一更新余额
    await memberBalanceModel.updateBalance(
      memberId, 
      changeAmount,
      {
        transactionType: remark || 'balance_change',
        connection
      }
    );
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新会员余额失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新会员新人状态为非新人
 * @param {number} memberId - 会员ID
 * @param {Object} connection - 数据库连接（可选，用于事务）
 * @returns {Promise<boolean>} 更新是否成功
 */
async function updateIsNewStatus(memberId, connection) {
  const conn = connection || await pool.getConnection();
  const shouldRelease = !connection; // 如果是外部传入的连接，则不需要释放
  
  try {
    if (shouldRelease) {
      await conn.beginTransaction();
    }
    
    // 更新会员新人状态为非新人
    const [result] = await conn.query(
      'UPDATE members SET is_new = 0 WHERE id = ? AND is_new = 1',
      [memberId]
    );
    
    if (shouldRelease) {
      await conn.commit();
    }
    
    return result.affectedRows > 0;
  } catch (error) {
    if (shouldRelease) {
      await conn.rollback();
    }
    logger.error(`更新会员新人状态失败: ${error.message}`);
    throw error;
  } finally {
    if (shouldRelease) {
      conn.release();
    }
  }
}

/**
 * 获取会员是否为新人
 * @param {number} memberId - 会员ID
 * @returns {Promise<boolean>} 是否为新人
 */
async function isNewMember(memberId) {
  try {
    const [rows] = await pool.query(
      'SELECT is_new FROM members WHERE id = ?',
      [memberId]
    );
    
    if (rows.length === 0) {
      throw new Error('会员不存在');
    }
    
    return rows[0].is_new === 1;
  } catch (error) {
    logger.error(`获取会员新人状态失败: ${error.message}`);
    throw error;
  }
}

/**
 * 发放奖励给会员
 * @param {number} memberId - 会员ID
 * @param {number} amount - 奖励金额
 * @param {string} remark - 备注说明
 * @param {number} waiterId - 操作人ID
 * @returns {Promise<Object>} 操作结果
 */
async function grantReward(memberId, amount, remark, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 验证会员是否存在
    const [memberRows] = await connection.query(
      'SELECT id, balance FROM members WHERE id = ?',
      [memberId]
    );
    
    if (memberRows.length === 0) {
      throw new Error('会员不存在');
    }
    
    // 验证金额是否合法
    const rewardAmount = parseFloat(amount);
    if (isNaN(rewardAmount) || rewardAmount <= 0) {
      throw new Error('奖励金额必须大于0');
    }
    
    // 获取当前余额用于返回结果
    const currentBalance = parseFloat(memberRows[0].balance) || 0;
    
    // 使用 memberBalanceModel 统一更新余额
    await memberBalanceModel.updateBalance(
      memberId, 
      rewardAmount, 
      {
        transactionType: BillType.REWARD_GRANT,
        connection
      }
    );
    
    // 创建账单记录，设置结算状态为success而不是默认的pending
    const billData = {
      memberId,
      billType: BillType.REWARD_GRANT,
      amount: rewardAmount.toFixed(2),
      remark,
      taskId: null,
      relatedMemberId: null,
      settlementStatus: 'success',
      waiterId
    };
    
    await billModel.createBill(billData, connection);
    
    await connection.commit();
    
    // 计算新余额
    const newBalance = currentBalance + rewardAmount;
    
    return {
      success: true,
      message: '奖励发放成功',
      data: {
        memberId,
        amount: rewardAmount.toFixed(2),
        beforeBalance: currentBalance.toFixed(2),
        afterBalance: newBalance.toFixed(2)
      }
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`发放奖励失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 从会员账户扣除奖励
 * @param {number} memberId - 会员ID
 * @param {number} amount - 扣除金额
 * @param {string} remark - 备注说明
 * @param {number} waiterId - 操作人ID
 * @returns {Promise<Object>} 操作结果
 */
async function deductReward(memberId, amount, remark, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 验证会员是否存在
    const [memberRows] = await connection.query(
      'SELECT id, balance FROM members WHERE id = ?',
      [memberId]
    );
    
    if (memberRows.length === 0) {
      throw new Error('会员不存在');
    }
    
    // 验证金额是否合法
    const deductAmount = parseFloat(amount);
    if (isNaN(deductAmount) || deductAmount <= 0) {
      throw new Error('扣除金额必须大于0');
    }
    
    // 获取当前余额用于返回结果
    const currentBalance = parseFloat(memberRows[0].balance) || 0;
    
    // 使用 memberBalanceModel 统一更新余额
    await memberBalanceModel.updateBalance(
      memberId, 
      -deductAmount, // 负数表示扣除
      {
        transactionType: BillType.REWARD_DEDUCTION,
        connection,
        allowNegativeBalance: true // 允许余额为负数
      }
    );
    
    // 创建账单记录，设置结算状态为success而不是默认的pending
    const billData = {
      memberId,
      billType: BillType.REWARD_DEDUCTION,
      amount: deductAmount.toFixed(2), // 使用正数，账单类型决定了是扣除
      remark,
      taskId: null,
      relatedMemberId: null,
      settlementStatus: 'success',
      waiterId
    };
    
    await billModel.createBill(billData, connection);
    
    await connection.commit();
    
    // 计算新余额
    const newBalance = currentBalance - deductAmount;
    
    return {
      success: true,
      message: '奖励扣除成功',
      data: {
        memberId,
        amount: deductAmount.toFixed(2),
        beforeBalance: currentBalance.toFixed(2),
        afterBalance: newBalance.toFixed(2)
      }
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`扣除奖励失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getList,
  getById,
  getByAccount,
  create,
  update,
  remove,
  checkGroupExists,
  updateMemberBalance,
  updateIsNewStatus,
  isNewMember,
  grantReward,
  deductReward
}; 