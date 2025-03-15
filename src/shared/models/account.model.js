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
  
  // 提取基本字段
  const formattedAccount = { ...account };
  
  // 格式化时间字段，使用驼峰命名法
  formattedAccount.createTime = formatDateTime(account.create_time);
  formattedAccount.updateTime = formatDateTime(account.update_time);
  
  // 转换字段名称为驼峰命名法
  formattedAccount.memberId = account.member_id;
  formattedAccount.accountType = account.account_type;
  formattedAccount.accountName = account.account_name;
  formattedAccount.accountValue = account.account_value;
  
  return formattedAccount;
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
    
    if (filters.accountType) {
      whereClause += ' AND a.account_type = ?';
      queryParams.push(filters.accountType);
    }
    
    // 构建查询语句
    const query = `
      SELECT a.*, m.nickname as member_name
      FROM account a
      LEFT JOIN member m ON a.member_id = m.id
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
      FROM account a
      WHERE ${whereClause}
    `;
    
    const [countRows] = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = countRows[0].total;
    
    // 格式化结果
    const formattedRows = rows.map(formatAccount);
    
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
      SELECT a.*, m.nickname as member_name
      FROM account a
      LEFT JOIN member m ON a.member_id = m.id
      WHERE a.member_id = ?
      ORDER BY a.account_type
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
 * 创建账户
 * @param {Object} accountData - 账户数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(accountData) {
  try {
    // 准备数据
    const data = {
      member_id: accountData.memberId,
      account_type: accountData.accountType,
      account_name: accountData.accountName,
      account_value: accountData.accountValue,
      create_time: new Date(),
      update_time: new Date()
    };
    
    // 执行插入
    const query = `
      INSERT INTO account SET ?
    `;
    
    const [result] = await pool.query(query, [data]);
    
    if (result.affectedRows === 0) {
      throw new Error('创建账户失败');
    }
    
    return {
      id: result.insertId,
      ...data
    };
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
      account_name: accountData.accountName,
      account_value: accountData.accountValue,
      update_time: new Date()
    };
    
    // 执行更新
    const query = `
      UPDATE account
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
      DELETE FROM account
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
  create,
  update,
  remove
}; 