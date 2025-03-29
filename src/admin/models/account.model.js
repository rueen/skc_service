/**
 * 管理端账户模型
 * 扩展共享账户模型，添加管理端特定功能
 */
const sharedAccountModel = require('../../shared/models/account.model');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const { pool } = require('../../shared/models/db');

// 继承 shared 模型的所有方法
const model = Object.assign({}, sharedAccountModel);

/**
 * 获取账户列表（包含额外的群组和渠道信息）
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 账户列表和总数
 */
model.getList = async function(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
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
             m.nickname as member_nickname,
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
      const formattedAccount = sharedAccountModel.formatAccount(row);
      
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
      const memberGroupMap = {};
      if (memberIds.length > 0) {
        // 使用 member_groups 关联表查询
        const placeholders = memberIds.map(() => '?').join(',');
        const [memberGroups] = await pool.query(`
          SELECT mg.member_id, mg.group_id, g.group_name, mg.is_owner
          FROM member_groups mg
          JOIN \`groups\` g ON mg.group_id = g.id
          WHERE mg.member_id IN (${placeholders})
        `, memberIds);
        
        // 整理群组信息
        memberGroups.forEach(mg => {
          if (!memberGroupMap[mg.member_id]) {
            memberGroupMap[mg.member_id] = {
              groupId: mg.group_id,
              groupName: mg.group_name,
              isGroupOwner: Boolean(mg.is_owner)
            };
          }
        });
      }
      
      // 扩展账号信息
      formattedRows.forEach(account => {
        const groupInfo = memberGroupMap[account.memberId] || { groupName: '', isGroupOwner: false };
        account.groupName = groupInfo.groupName;
        account.isGroupOwner = groupInfo.isGroupOwner;
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

module.exports = model; 