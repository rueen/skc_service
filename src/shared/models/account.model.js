/**
 * 账户模型
 * 处理账户相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');

/**
 * 格式化账户信息
 * @param {Object} account - 账户信息
 * @returns {Object} 格式化后的账户信息
 */
function formatAccount(account) {
  if (!account) return null;
  
  // 创建一个只包含需要的驼峰命名字段的对象
  return {
    id: account.id,
    account: account.account,
    memberId: account.member_id,
    channelId: account.channel_id,
    channelName: account.channel_name,
    channelIcon: account.channel_icon,
    homeUrl: account.home_url,
    fansCount: account.fans_count,
    friendsCount: account.friends_count,
    postsCount: account.posts_count,
    accountAuditStatus: account.account_audit_status,
    rejectReason: account.reject_reason,
    memberNickname: account.member_name,
    createTime: formatDateTime(account.create_time),
    updateTime: formatDateTime(account.update_time)
  };
}

/**
 * 获取账户列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 账户列表和总数
 */
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
    
    if (filters.groupId) {
      whereClause += ' AND EXISTS (SELECT 1 FROM member_groups mg WHERE mg.member_id = a.member_id AND mg.group_id = ?)';
      queryParams.push(filters.groupId);
    }
    
    // 构建查询语句
    const query = `
      SELECT a.*, 
             m.member_nickname as member_name,
             c.name as channel_name,
             c.icon as channel_icon,
             c.custom_fields as channel_custom_fields
      FROM accounts a
      LEFT JOIN members m ON a.member_id = m.id
      LEFT JOIN channels c ON a.channel_id = c.id
      WHERE ${whereClause}
      ORDER BY a.create_time DESC
      LIMIT ? OFFSET ?
    `;
    
    // 添加分页参数
    queryParams.push(parseInt(pageSize, 10), offset);
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM accounts a
      WHERE ${whereClause}
    `;
    
    const [countRows] = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = countRows[0].total;
    
    // 处理渠道自定义字段
    const formattedRows = rows.map(row => {
      const formattedAccount = formatAccount(row);
      
      // 处理渠道自定义字段
      if (row.channel_custom_fields) {
        try {
          formattedAccount.channelCustomFields = JSON.parse(row.channel_custom_fields);
        } catch (e) {
          formattedAccount.channelCustomFields = [];
        }
      } else {
        formattedAccount.channelCustomFields = [];
      }
      
      return formattedAccount;
    });
    
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
}

/**
 * 根据会员ID获取账户列表
 * @param {number} memberId - 会员ID
 * @returns {Promise<Array>} 账户列表
 */
async function getByMemberId(memberId) {
  try {
    const query = `
      SELECT a.*, 
             m.member_nickname as member_name,
             c.name as channel_name,
             c.icon as channel_icon
      FROM accounts a
      LEFT JOIN members m ON a.member_id = m.id
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
             m.member_nickname as member_name,
             c.name as channel_name,
             c.icon as channel_icon
      FROM accounts a
      LEFT JOIN members m ON a.member_id = m.id
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
    // 准备数据
    const data = {
      member_id: accountData.memberId,
      channel_id: accountData.channelId,
      account: accountData.account,
      home_url: accountData.homeUrl,
      fans_count: accountData.fansCount || 0,
      friends_count: accountData.friendsCount || 0,
      posts_count: accountData.postsCount || 0,
      account_audit_status: accountData.accountAuditStatus || 'pending',
      create_time: new Date(),
      update_time: new Date()
    };
    
    // 执行插入
    const query = `
      INSERT INTO accounts SET ?
    `;
    
    const [result] = await pool.query(query, [data]);
    
    if (result.affectedRows === 0) {
      throw new Error('创建账户失败');
    }
    
    // 查询新创建的账号(包含渠道信息)
    const newAccountQuery = `
      SELECT a.*, 
             m.member_nickname as member_name,
             c.name as channel_name,
             c.icon as channel_icon
      FROM accounts a
      LEFT JOIN members m ON a.member_id = m.id
      LEFT JOIN channels c ON a.channel_id = c.id
      WHERE a.id = ?
    `;
    
    const [accounts] = await pool.query(newAccountQuery, [result.insertId]);
    
    if (accounts.length === 0) {
      throw new Error('获取新创建的账户信息失败');
    }
    
    // 格式化并返回结果
    return formatAccount(accounts[0]);
  } catch (error) {
    logger.error(`创建账户失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新账户
 * @param {Object} accountData - 账户数据
 * @returns {Promise<Object>} 更新结果
 */
async function update(accountData) {
  try {
    // 准备数据
    const data = {
      account: accountData.account,
      home_url: accountData.homeUrl,
      fans_count: accountData.fansCount,
      friends_count: accountData.friendsCount,
      posts_count: accountData.postsCount,
      account_audit_status: accountData.accountAuditStatus,
      reject_reason: accountData.rejectReason,
      update_time: new Date()
    };
    
    // 删除未定义的字段
    Object.keys(data).forEach(key => {
      if (data[key] === undefined) {
        delete data[key];
      }
    });
    
    // 执行更新
    const query = `
      UPDATE accounts
      SET ?
      WHERE id = ?
    `;
    
    const [result] = await pool.query(query, [data, accountData.id]);
    
    if (result.affectedRows === 0) {
      throw new Error('更新账户失败');
    }
    
    return {
      success: true,
      message: '账户更新成功'
    };
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

module.exports = {
  getList,
  getByMemberId,
  getByMemberAndChannel,
  create,
  update,
  remove
}; 