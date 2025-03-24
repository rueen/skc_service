/**
 * 账单模型
 * 处理账单相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');
const { formatDateTime } = require('../utils/date.util');

/**
 * 获取会员账单列表
 * @param {number} memberId - 会员ID
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @param {string} options.billType - 账单类型
 * @param {string} options.settlementStatus - 结算状态
 * @returns {Promise<Object>} 账单列表和统计信息
 */
async function getMemberBills(memberId, options = {}) {
  const { 
    page = DEFAULT_PAGE, 
    pageSize = DEFAULT_PAGE_SIZE,
    billType,
    settlementStatus
  } = options;
  
  const offset = (page - 1) * pageSize;
  const params = [memberId];
  let whereClause = 'WHERE b.member_id = ?';
  
  if (billType) {
    whereClause += ' AND b.bill_type = ?';
    params.push(billType);
  }
  
  if (settlementStatus) {
    whereClause += ' AND b.settlement_status = ?';
    params.push(settlementStatus);
  }
  
  try {
    // 获取账单总数
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM bills b ${whereClause}`,
      params
    );
    const total = countRows[0].total;
    
    // 获取账单列表
    const [rows] = await pool.query(
      `SELECT 
        b.id,
        b.member_id as memberId,
        b.bill_type as billType,
        b.amount,
        b.settlement_status as settlementStatus,
        b.task_id as taskId,
        b.related_member_id as relatedMemberId,
        b.failure_reason as failureReason,
        b.create_time as createTime,
        b.update_time as updateTime,
        t.task_name as taskName,
        m.member_nickname as relatedMemberNickname
      FROM bills b
      LEFT JOIN tasks t ON b.task_id = t.id
      LEFT JOIN members m ON b.related_member_id = m.id
      ${whereClause}
      ORDER BY b.create_time DESC
      LIMIT ?, ?`,
      [...params, offset, parseInt(pageSize, 10)]
    );
    
    // 格式化日期时间
    const formattedRows = rows.map(row => ({
      ...row,
      createTime: formatDateTime(row.createTime),
      updateTime: formatDateTime(row.updateTime)
    }));
    
    return {
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      list: formattedRows
    };
  } catch (error) {
    logger.error(`获取会员账单列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有账单列表（管理员用）
 * @param {Object} filters - 筛选条件
 * @param {string} filters.memberNickname - 会员昵称
 * @param {string} filters.billType - 账单类型
 * @param {string} filters.settlementStatus - 结算状态
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 账单列表和统计信息
 */
async function getAllBills(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  const { memberNickname, billType, settlementStatus } = filters;
  const params = [];
  let whereClause = 'WHERE 1=1';
  
  if (memberNickname) {
    whereClause += ' AND m.member_nickname LIKE ?';
    params.push(`%${memberNickname}%`);
  }
  
  if (billType) {
    whereClause += ' AND b.bill_type = ?';
    params.push(billType);
  }
  
  if (settlementStatus) {
    whereClause += ' AND b.settlement_status = ?';
    params.push(settlementStatus);
  }
  
  const offset = (page - 1) * pageSize;
  
  try {
    // 获取账单总数
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM bills b
       JOIN members m ON b.member_id = m.id
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;
    
    // 获取账单列表
    const [rows] = await pool.query(
      `SELECT 
        b.id,
        b.member_id as memberId,
        m.member_nickname as memberNickname,
        b.bill_type as billType,
        b.amount,
        b.settlement_status as settlementStatus,
        b.task_id as taskId,
        b.related_member_id as relatedMemberId,
        b.failure_reason as failureReason,
        b.create_time as createTime,
        b.update_time as updateTime,
        t.task_name as taskName,
        rm.member_nickname as relatedMemberNickname
      FROM bills b
      JOIN members m ON b.member_id = m.id
      LEFT JOIN tasks t ON b.task_id = t.id
      LEFT JOIN members rm ON b.related_member_id = rm.id
      ${whereClause}
      ORDER BY b.create_time DESC
      LIMIT ?, ?`,
      [...params, offset, parseInt(pageSize, 10)]
    );
    
    // 格式化日期时间
    const formattedRows = rows.map(row => ({
      ...row,
      createTime: formatDateTime(row.createTime),
      updateTime: formatDateTime(row.updateTime)
    }));
    
    return {
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      list: formattedRows
    };
  } catch (error) {
    logger.error(`获取所有账单列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getMemberBills,
  getAllBills
}; 