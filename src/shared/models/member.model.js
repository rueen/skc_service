/**
 * 会员模型
 * 处理会员相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const crypto = require('crypto');

/**
 * 格式化会员信息
 * @param {Object} member - 会员信息
 * @param {Object} groupInfo - 关联的群组信息（可选）
 * @returns {Object} 格式化后的会员信息
 */
function formatMember(member, groupInfo = null) {
  if (!member) return null;
  
  // 提取群组信息（优先使用传入的groupInfo，其次是member中的群组信息）
  const group = groupInfo || {
    groupId: member.group_id,
    groupName: member.group_name,
    groupLink: member.group_link,
    isGroupOwner: member.is_owner === 1
  };
  
  return {
    id: member.id,
    memberNickname: member.member_nickname,
    memberAccount: member.member_account,
    password: member.password,
    groupId: group.groupId,
    groupName: group.groupName,
    groupLink: group.groupLink,
    inviterId: member.inviter_id,
    inviterName: member.inviter_name,
    occupation: member.occupation,
    isGroupOwner: group.isGroupOwner,
    inviteCode: member.invite_code,
    hasPassword: !!member.password,
    phone: member.phone || '',
    email: member.email || '',
    avatar: member.avatar || '',
    gender: member.gender !== undefined ? member.gender : 2, // 默认为保密
    telegram: member.telegram || '',
    createTime: formatDateTime(member.create_time),
    updateTime: formatDateTime(member.update_time)
  };
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
    let query = `
      SELECT m.*, 
             g.group_name, g.group_link,
             mg.group_id, mg.is_owner,
             inv.member_nickname as inviter_name
      FROM members m
      LEFT JOIN member_groups mg ON m.id = mg.member_id
      LEFT JOIN \`groups\` g ON mg.group_id = g.id
      LEFT JOIN members inv ON m.inviter_id = inv.id
    `;
    
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM members m
    `;
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.memberNickname) {
      conditions.push('m.member_nickname LIKE ?');
      queryParams.push(`%${filters.memberNickname}%`);
    }
    
    if (filters.groupId) {
      conditions.push('mg.group_id = ?');
      queryParams.push(filters.groupId);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 添加排序和分页
    query += ' ORDER BY m.create_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    // 获取每个会员的账号列表
    const memberIds = rows.map(row => row.id);
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
        accountsMap[account.member_id].push({
          id: account.id,
          account: account.account,
          homeUrl: account.home_url,
          channelId: account.channel_id,
          channelName: account.channel_name,
          channelIcon: account.channel_icon,
          fansCount: account.fans_count,
          friendsCount: account.friends_count,
          postsCount: account.posts_count,
          accountAuditStatus: account.account_audit_status,
          createTime: formatDateTime(account.create_time)
        });
      });
    }
    
    // 添加账号列表到会员信息中
    const formattedMembers = rows.map(member => {
      const groupInfo = {
        groupId: member.group_id,
        groupName: member.group_name,
        groupLink: member.group_link,
        isGroupOwner: member.is_owner === 1
      };
      
      const formattedMember = formatMember(member, groupInfo);
      formattedMember.accountList = accountsMap[member.id] || [];
      return formattedMember;
    });
    
    return {
      list: formattedMembers,
      total: countResult[0].total,
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
    const [rows] = await pool.query(
      `SELECT m.*, g.group_name, g.group_link,
              mg.group_id, mg.is_owner,
              inv.member_nickname as inviter_name
       FROM members m
       LEFT JOIN member_groups mg ON m.id = mg.member_id
       LEFT JOIN \`groups\` g ON mg.group_id = g.id
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
    
    // 准备群组信息
    const groupInfo = {
      groupId: rows[0].group_id,
      groupName: rows[0].group_name,
      groupLink: rows[0].group_link,
      isGroupOwner: rows[0].is_owner === 1
    };
    
    const member = formatMember(rows[0], groupInfo);
    member.accountList = accounts.map(account => ({
      id: account.id,
      channelId: account.channel_id,
      channelName: account.channel_name,
      channelIcon: account.channel_icon,
      account: account.account,
      homeUrl: account.home_url,
      fansCount: account.fans_count,
      friendsCount: account.friends_count,
      postsCount: account.posts_count,
      accountAuditStatus: account.account_audit_status,
      createTime: formatDateTime(account.create_time)
    }));
    
    // 生成邀请链接
    if (member.inviteCode) {
      member.inviteUrl = `${process.env.BASE_URL || 'http://localhost:3001'}/invite/${member.inviteCode}`;
    }
    
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
    const [rows] = await pool.query(
      `SELECT m.*, g.group_name, g.group_link,
              mg.group_id, mg.is_owner,
              inv.member_nickname as inviter_name
       FROM members m
       LEFT JOIN member_groups mg ON m.id = mg.member_id
       LEFT JOIN \`groups\` g ON mg.group_id = g.id
       LEFT JOIN members inv ON m.inviter_id = inv.id
       WHERE m.member_account = ?`,
      [account]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    // 准备群组信息
    const groupInfo = {
      groupId: rows[0].group_id,
      groupName: rows[0].group_name,
      groupLink: rows[0].group_link,
      isGroupOwner: rows[0].is_owner === 1
    };
    
    return formatMember(rows[0], groupInfo);
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
      'SELECT id FROM members WHERE member_account = ?',
      [memberData.memberAccount]
    );
    
    if (existingAccount.length > 0) {
      throw new Error('会员账号已存在');
    }
    
    // 检查群组是否存在
    if (memberData.groupId) {
      const [group] = await connection.query(
        'SELECT id FROM `groups` WHERE id = ?',
        [memberData.groupId]
      );
      
      if (group.length === 0) {
        throw new Error('所选群组不存在');
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
       (member_nickname, member_account, password, inviter_id, occupation, invite_code, phone, email, avatar, gender, telegram)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        memberData.memberNickname,
        memberData.memberAccount,
        memberData.password || null,
        memberData.inviterId || null,
        memberData.occupation || null,
        inviteCode,
        memberData.phone || null,
        memberData.email || null,
        memberData.avatar || null,
        memberData.gender !== undefined ? memberData.gender : 2, // 默认为保密
        memberData.telegram || null
      ]
    );
    
    const memberId = result.insertId;
    
    // 如果指定了群组，创建会员-群组关联
    if (memberData.groupId) {
      await connection.query(
        `INSERT INTO member_groups 
         (member_id, group_id, is_owner)
         VALUES (?, ?, ?)`,
        [memberId, memberData.groupId, memberData.isGroupOwner ? 1 : 0]
      );
      
      // 如果设置为群主，更新群组的群主ID
      if (memberData.isGroupOwner) {
        // 先清除该群组的原群主
        await connection.query(
          'UPDATE member_groups SET is_owner = 0 WHERE group_id = ? AND member_id != ?',
          [memberData.groupId, memberId]
        );
        
        // 设置新群主
        await connection.query(
          'UPDATE `groups` SET owner_id = ? WHERE id = ?',
          [memberId, memberData.groupId]
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
    
    // 获取会员当前所在的群组和群主状态
    const [memberGroup] = await connection.query(
      `SELECT mg.group_id, mg.is_owner
       FROM member_groups mg
       WHERE mg.member_id = ?`,
      [memberData.id]
    );
    
    const currentGroupId = memberGroup.length > 0 ? memberGroup[0].group_id : null;
    const currentIsOwner = memberGroup.length > 0 ? memberGroup[0].is_owner === 1 : false;
    
    // 检查会员账号是否已被其他会员使用
    if (memberData.memberAccount) {
      const [existingAccount] = await connection.query(
        'SELECT id FROM members WHERE member_account = ? AND id != ?',
        [memberData.memberAccount, memberData.id]
      );
      
      if (existingAccount.length > 0) {
        throw new Error('会员账号已被其他会员使用');
      }
    }
    
    // 检查群组是否存在
    if (memberData.groupId) {
      const [group] = await connection.query(
        'SELECT id FROM `groups` WHERE id = ?',
        [memberData.groupId]
      );
      
      if (group.length === 0) {
        throw new Error('所选群组不存在');
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
      updateFields.push('member_nickname = ?');
      params.push(memberData.memberNickname);
    }
    
    if (memberData.memberAccount !== undefined) {
      updateFields.push('member_account = ?');
      params.push(memberData.memberAccount);
    }
    
    if (memberData.password !== undefined) {
      updateFields.push('password = ?');
      params.push(memberData.password);
    }
    
    if (memberData.phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(memberData.phone);
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
    
    if (memberData.inviterId !== undefined) {
      updateFields.push('inviter_id = ?');
      params.push(memberData.inviterId);
    }
    
    if (memberData.occupation !== undefined) {
      updateFields.push('occupation = ?');
      params.push(memberData.occupation);
    }
    
    if (updateFields.length > 0) {
      params.push(memberData.id);
      
      // 更新会员信息
      await connection.query(
        `UPDATE members SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    // 处理群组和群主变更
    const groupIdChanged = memberData.groupId !== undefined && memberData.groupId !== currentGroupId;
    const isOwnerChanged = memberData.isGroupOwner !== undefined && memberData.isGroupOwner !== currentIsOwner;
    
    if (groupIdChanged || isOwnerChanged) {
      // 如果变更了群组
      if (groupIdChanged) {
        // 如果之前有群组，删除旧的关联
        if (currentGroupId) {
          // 如果是群主，先清除群组的owner_id
          if (currentIsOwner) {
            await connection.query(
              'UPDATE `groups` SET owner_id = NULL WHERE id = ? AND owner_id = ?',
              [currentGroupId, memberData.id]
            );
          }
          
          // 删除旧的关联
          await connection.query(
            'DELETE FROM member_groups WHERE member_id = ?',
            [memberData.id]
          );
        }
        
        // 如果新指定了群组，创建新的关联
        if (memberData.groupId) {
          const isOwner = memberData.isGroupOwner !== undefined ? memberData.isGroupOwner : false;
          
          await connection.query(
            'INSERT INTO member_groups (member_id, group_id, is_owner) VALUES (?, ?, ?)',
            [memberData.id, memberData.groupId, isOwner ? 1 : 0]
          );
          
          // 如果设置为群主，更新群组的owner_id
          if (isOwner) {
            // 先清除群组内其他成员的群主状态
            await connection.query(
              'UPDATE member_groups SET is_owner = 0 WHERE group_id = ? AND member_id != ?',
              [memberData.groupId, memberData.id]
            );
            
            // 设置群组的owner_id
            await connection.query(
              'UPDATE `groups` SET owner_id = ? WHERE id = ?',
              [memberData.id, memberData.groupId]
            );
          }
        }
      } 
      // 如果只变更了群主状态但群组没变
      else if (isOwnerChanged && currentGroupId) {
        if (memberData.isGroupOwner) {
          // 先清除群组内其他成员的群主状态
          await connection.query(
            'UPDATE member_groups SET is_owner = 0 WHERE group_id = ? AND member_id != ?',
            [currentGroupId, memberData.id]
          );
          
          // 设置当前会员为群主
          await connection.query(
            'UPDATE member_groups SET is_owner = 1 WHERE member_id = ? AND group_id = ?',
            [memberData.id, currentGroupId]
          );
          
          // 更新群组的owner_id
          await connection.query(
            'UPDATE `groups` SET owner_id = ? WHERE id = ?',
            [memberData.id, currentGroupId]
          );
        } else {
          // 取消群主身份
          await connection.query(
            'UPDATE member_groups SET is_owner = 0 WHERE member_id = ? AND group_id = ?',
            [memberData.id, currentGroupId]
          );
          
          // 清除群组的owner_id（如果当前会员是群主）
          await connection.query(
            'UPDATE `groups` SET owner_id = NULL WHERE id = ? AND owner_id = ?',
            [currentGroupId, memberData.id]
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
      'SELECT COUNT(*) as count FROM task_submitted WHERE member_id = ?',
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

module.exports = {
  getList,
  getById,
  getByAccount,
  create,
  update,
  remove
}; 