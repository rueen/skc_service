/**
 * FB老账号模型
 * 处理FB老账号相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');

/**
 * 格式化FB老账号信息
 * @param {Object} oldAccount - FB老账号信息
 * @returns {Object} 格式化后的FB老账号信息
 */
function formatOldAccountFb(oldAccount) {
  if (!oldAccount) return null;
  
  // 转换字段名称为驼峰命名法并格式化日期
  const formattedAccount = convertToCamelCase({
    ...oldAccount,
    createTime: formatDateTime(oldAccount.create_time),
    updateTime: formatDateTime(oldAccount.update_time)
  });
  
  return formattedAccount;
}

/**
 * 获取FB老账号列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} FB老账号列表及分页信息
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let baseQuery = `
      SELECT oaf.*, m.nickname AS member_nickname
      FROM old_accounts_fb oaf
      LEFT JOIN members m ON oaf.member_id = m.id
    `;
    
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM old_accounts_fb oaf
    `;
    
    const queryParams = [];
    const conditions = [];
    
    if (filters.keyword) {
      conditions.push('(oaf.uid LIKE ? OR oaf.nickname LIKE ? OR oaf.home_url LIKE ?)');
      queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    
    if (filters.memberId) {
      conditions.push('oaf.member_id = ?');
      queryParams.push(filters.memberId);
    }
    
    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      baseQuery += whereClause;
      countQuery += whereClause;
    }
    
    baseQuery += ' ORDER BY oaf.create_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));
    
    const [oldAccounts] = await pool.query(baseQuery, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    return {
      list: oldAccounts.map(formatOldAccountFb),
      pagination: {
        total: countResult[0].total,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10)
      }
    };
  } catch (error) {
    logger.error(`获取FB老账号列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取FB老账号
 * @param {number} id - FB老账号ID
 * @returns {Promise<Object|null>} FB老账号信息
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT oaf.*, m.nickname AS member_nickname
       FROM old_accounts_fb oaf
       LEFT JOIN members m ON oaf.member_id = m.id
       WHERE oaf.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatOldAccountFb(rows[0]);
  } catch (error) {
    logger.error(`根据ID获取FB老账号失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据UID获取FB老账号
 * @param {string} uid - FB账户标识
 * @returns {Promise<Object|null>} FB老账号信息
 */
async function getByUid(uid) {
  try {
    const [rows] = await pool.query(
      `SELECT oaf.*, m.nickname AS member_nickname
       FROM old_accounts_fb oaf
       LEFT JOIN members m ON oaf.member_id = m.id
       WHERE oaf.uid = ?`,
      [uid]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatOldAccountFb(rows[0]);
  } catch (error) {
    logger.error(`根据UID获取FB老账号失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据主页链接获取UID
 * @param {string} homeUrl - FB主页链接
 * @returns {Promise<string|null>} FB账户UID或null
 */
async function getUidByHomeUrl(homeUrl) {
  try {
    const [rows] = await pool.query(
      `SELECT uid FROM old_accounts_fb WHERE home_url = ?`,
      [homeUrl]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return rows[0].uid;
  } catch (error) {
    logger.error(`根据主页链接获取UID失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建FB老账号
 * @param {Object} accountData - 账号数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(accountData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查UID是否已存在
    const [existingUid] = await connection.query(
      'SELECT id FROM old_accounts_fb WHERE uid = ?',
      [accountData.uid]
    );
    
    if (existingUid.length > 0) {
      throw new Error('该UID已存在');
    }
    
    // 准备插入数据
    const data = {
      uid: accountData.uid,
      nickname: accountData.nickname,
      home_url: accountData.homeUrl || null,
      member_id: accountData.memberId || null
    };
    
    // 执行插入
    const [result] = await connection.query(
      'INSERT INTO old_accounts_fb SET ?',
      [data]
    );
    
    // 获取新创建的账号信息
    const [rows] = await connection.query(
      `SELECT oaf.*, m.nickname AS member_nickname
       FROM old_accounts_fb oaf
       LEFT JOIN members m ON oaf.member_id = m.id
       WHERE oaf.id = ?`,
      [result.insertId]
    );
    
    await connection.commit();
    
    return formatOldAccountFb(rows[0]);
  } catch (error) {
    await connection.rollback();
    logger.error(`创建FB老账号失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新FB老账号
 * @param {Object} accountData - 账号数据
 * @returns {Promise<boolean>} 更新结果
 */
async function update(accountData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查账号是否存在
    const [existingAccount] = await connection.query(
      'SELECT id, member_id FROM old_accounts_fb WHERE id = ?',
      [accountData.id]
    );
    
    if (existingAccount.length === 0) {
      throw new Error('FB老账号不存在');
    }
    
    // 检查UID是否被其他账号占用
    if (accountData.uid) {
      const [existingUid] = await connection.query(
        'SELECT id FROM old_accounts_fb WHERE uid = ? AND id != ?',
        [accountData.uid, accountData.id]
      );
      
      if (existingUid.length > 0) {
        throw new Error('该UID已被其他账号使用');
      }
    }
    
    // 准备更新数据
    const data = {};
    
    if (accountData.uid !== undefined) data.uid = accountData.uid;
    if (accountData.nickname !== undefined) data.nickname = accountData.nickname;
    if (accountData.homeUrl !== undefined) data.home_url = accountData.homeUrl;
    
    // 只有在账号未关联会员时才允许更新member_id
    if (existingAccount[0].member_id === null && accountData.memberId !== undefined) {
      data.member_id = accountData.memberId;
    }
    
    if (Object.keys(data).length === 0) {
      return true; // 没有数据需要更新
    }
    
    // 执行更新
    const [result] = await connection.query(
      'UPDATE old_accounts_fb SET ? WHERE id = ?',
      [data, accountData.id]
    );
    
    await connection.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新FB老账号失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除FB老账号
 * @param {number} id - FB老账号ID
 * @returns {Promise<boolean>} 删除结果
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查账号是否存在
    const [existingAccount] = await connection.query(
      'SELECT id, member_id FROM old_accounts_fb WHERE id = ?',
      [id]
    );
    
    if (existingAccount.length === 0) {
      throw new Error('FB老账号不存在');
    }
    
    // 执行删除
    const [result] = await connection.query(
      'DELETE FROM old_accounts_fb WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除FB老账号失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 导入FB老账号数据
 * @param {Array<Object>} accounts - FB老账号数据数组
 * @returns {Promise<Object>} 导入结果
 */
async function importAccounts(accounts) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 获取当前所有FB老账号UID和关联状态
    const [existingAccounts] = await connection.query(
      'SELECT id, uid, member_id FROM old_accounts_fb'
    );
    
    // 创建UID到账号ID的映射
    const uidToIdMap = {};
    // 已关联会员的UID列表
    const boundUids = [];
    
    existingAccounts.forEach(acc => {
      uidToIdMap[acc.uid] = acc.id;
      if (acc.member_id !== null) {
        boundUids.push(acc.uid);
      }
    });
    
    let updated = 0;
    let inserted = 0;
    let skipped = 0;
    
    // 处理每个导入的账号
    for (const acc of accounts) {
      // 如果UID已存在且已关联会员，则跳过
      if (boundUids.includes(acc.uid)) {
        skipped++;
        continue;
      }
      
      // 如果UID已存在且未关联会员，则更新
      if (uidToIdMap[acc.uid]) {
        await connection.query(
          'UPDATE old_accounts_fb SET nickname = ?, home_url = ? WHERE id = ?',
          [acc.nickname, acc.homeUrl || null, uidToIdMap[acc.uid]]
        );
        updated++;
      } else {
        // 如果UID不存在，则插入
        await connection.query(
          'INSERT INTO old_accounts_fb (uid, nickname, home_url, member_id) VALUES (?, ?, ?, NULL)',
          [acc.uid, acc.nickname, acc.homeUrl || null]
        );
        inserted++;
      }
    }
    
    await connection.commit();
    
    return {
      total: accounts.length,
      updated: updated,
      inserted: inserted,
      skipped: skipped
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`导入FB老账号失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 关联FB老账号与会员
 * @param {string} uid - FB账户标识
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 关联结果
 */
async function bindMember(uid, memberId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 查找老账号
    const [oldAccounts] = await connection.query(
      'SELECT id, member_id FROM old_accounts_fb WHERE uid = ?',
      [uid]
    );
    
    let oldAccountId;
    
    if (oldAccounts.length === 0) {
      // 老账号不存在，直接返回成功但不创建关联
      await connection.commit();
      return { success: true, associated: false, message: '未找到匹配的FB老账号' };
    } else {
      oldAccountId = oldAccounts[0].id;
      
      // 检查是否已关联其他会员
      if (oldAccounts[0].member_id !== null && oldAccounts[0].member_id !== memberId) {
        await connection.commit();
        return { success: true, associated: false, message: '该FB老账号已关联其他会员' };
      }
      
      // 更新老账号的member_id
      await connection.query(
        'UPDATE old_accounts_fb SET member_id = ? WHERE id = ?',
        [memberId, oldAccountId]
      );
      
      // 创建关联记录
      const [existingBinding] = await connection.query(
        'SELECT id FROM member_old_accounts_fb WHERE member_id = ? AND old_accounts_fb_id = ?',
        [memberId, oldAccountId]
      );
      
      if (existingBinding.length === 0) {
        await connection.query(
          'INSERT INTO member_old_accounts_fb (member_id, old_accounts_fb_id) VALUES (?, ?)',
          [memberId, oldAccountId]
        );
      }
      
      // 更新会员is_new状态为0（非新人）
      await connection.query(
        'UPDATE members SET is_new = 0 WHERE id = ?',
        [memberId]
      );
    }
    
    await connection.commit();
    
    return { success: true, associated: true, message: '成功关联FB老账号' };
  } catch (error) {
    await connection.rollback();
    logger.error(`关联FB老账号与会员失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  formatOldAccountFb,
  getList,
  getById,
  getByUid,
  getUidByHomeUrl,
  create,
  update,
  remove,
  importAccounts,
  bindMember
}; 