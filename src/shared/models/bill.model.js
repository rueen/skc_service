/**
 * 账单模型
 * 处理账单相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化账单信息
 * @param {Object} bill - 账单信息
 * @returns {Object} 格式化后的账单信息
 */
function formatBill(bill) {
  if (!bill) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedBill = convertToCamelCase({
    ...bill,
    createTime: formatDateTime(bill.create_time),
    updateTime: formatDateTime(bill.update_time),
  });
  
  // 确保submittedId字段被正确返回
  if (bill.submitted_id !== undefined) {
    formattedBill.submittedId = bill.submitted_id;
  }

  // 确保waiterUsername字段被正确返回
  if (bill.waiter_username !== undefined) {
    formattedBill.waiterName = bill.waiter_username;
  }
  
  return formattedBill;
}

/**
 * 创建账单记录
 * @param {Object} billData - 账单数据
 * @param {number} billData.memberId - 会员ID
 * @param {string} billData.billType - 账单类型
 * @param {number} billData.amount - 金额
 * @param {number} billData.taskId - 任务ID
 * @param {number} [billData.withdrawalId] - 关联的提现ID
 * @param {number} [billData.relatedMemberId] - 关联会员ID（如邀请关系）
 * @param {number} [billData.relatedGroupId] - 关联群组ID（用于数据统计）
 * @param {string} [billData.remark] - 备注说明
 * @param {string} [billData.settlementStatus] - 结算状态，默认为'pending'
 * @param {number} [billData.waiterId] - 操作人ID
 * @param {string} [billData.billNo] - 账单编号，如果提供则使用此编号
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 创建结果
 */
async function createBill(billData, connection) {
  try {
    // 日志记录所有传入的账单数据，便于调试
    logger.info(`创建账单记录 - 会员ID: ${billData.memberId}, 账单类型: ${billData.billType}, 金额: ${billData.amount}, 任务ID: ${billData.taskId}, 提现ID: ${billData.withdrawalId || '无'}, 关联会员ID: ${billData.relatedMemberId}, 关联群组ID: ${billData.relatedGroupId}, 备注: ${billData.remark || '无'}, 结算状态: ${billData.settlementStatus || 'pending'}, 操作人ID: ${billData.waiterId || '无'}`);
    
    // 进一步确认related_group_id是一个有效数字
    let relatedGroupId = null;
    if (billData.relatedGroupId && !isNaN(parseInt(billData.relatedGroupId, 10))) {
      relatedGroupId = parseInt(billData.relatedGroupId, 10);
      
      // 额外检查群组是否存在
      const [groups] = await connection.query(
        'SELECT id FROM `groups` WHERE id = ?',
        [relatedGroupId]
      );
      
      if (groups.length === 0) {
        logger.warn(`关联的群组ID ${relatedGroupId} 不存在，将设置为NULL`);
        relatedGroupId = null;
      }
    }
    
    // 如果没有有效的群组ID，尝试从会员的第一个群组获取
    if (!relatedGroupId) {
      const [groups] = await connection.query(
        `SELECT group_id 
         FROM member_groups 
         WHERE member_id = ? 
         ORDER BY join_time ASC, id ASC 
         LIMIT 1`,
        [billData.memberId]
      );
      
      if (groups.length > 0) {
        relatedGroupId = groups[0].group_id;
        logger.info(`未提供有效的群组ID，使用会员的第一个群组: ${relatedGroupId}`);
      }
    }
    
    // 根据账单类型初始化不同的状态字段
    const isWithdrawal = billData.billType === 'withdrawal';
    const statusField = isWithdrawal ? 'withdrawal_status' : 'settlement_status';
    const statusValue = isWithdrawal ? 'pending' : (billData.settlementStatus || 'pending'); // 使用提供的结算状态或默认值
    
    // 使用提供的账单编号或生成新的账单编号
    let billNo = billData.billNo;
    if (!billNo) {
      const timestamp = new Date().getTime();
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const billType = billData.billType.toUpperCase().substring(0, 3);
      billNo = `${billType}${timestamp}${randomNum}`;
    }
    
    // 构建插入语句
    const [result] = await connection.query(
      `INSERT INTO bills 
       (bill_no, member_id, bill_type, amount, ${statusField}, task_id, withdrawal_id, related_member_id, related_group_id, waiter_id, remark) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        billNo,
        billData.memberId,
        billData.billType,
        billData.amount,
        statusValue,
        billData.taskId,
        billData.withdrawalId || null,
        billData.relatedMemberId || null,
        relatedGroupId,
        billData.waiterId || null,
        billData.remark || null
      ]
    );
    
    // 记录插入结果
    logger.info(`账单记录创建成功 - 账单ID: ${result.insertId}, 账单编号: ${billNo}, 关联群组ID: ${relatedGroupId}, 状态字段: ${statusField}, 状态值: ${statusValue}, 操作人ID: ${billData.waiterId || '无'}`);
    
    // 验证插入结果
    const [inserted] = await connection.query(
      'SELECT bill_no, related_group_id, withdrawal_id FROM bills WHERE id = ?',
      [result.insertId]
    );
    
    if (inserted.length > 0) {
      logger.info(`验证插入结果 - 账单ID: ${result.insertId}, 账单编号: ${inserted[0].bill_no}, 实际存储的关联群组ID: ${inserted[0].related_group_id}, 关联提现ID: ${inserted[0].withdrawal_id}`);
    }
    
    return { id: result.insertId, billNo };
  } catch (error) {
    logger.error(`创建账单记录失败: ${error.message}`);
    throw error;
  }
}

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
        b.*,
        t.task_name,
        m.nickname as related_member_nickname,
        g.group_name as related_group_name
      FROM bills b
      LEFT JOIN tasks t ON b.task_id = t.id
      LEFT JOIN members m ON b.related_member_id = m.id
      LEFT JOIN \`groups\` g ON b.related_group_id = g.id
      ${whereClause}
      ORDER BY b.create_time DESC
      LIMIT ?, ?`,
      [...params, offset, parseInt(pageSize, 10)]
    );
    
    // 格式化账单列表
    const formattedList = rows.map(row => formatBill(row));
    
    return {
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      list: formattedList
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
 * @param {string} filters.billNo - 账单编号
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 账单列表和统计信息
 */
async function getAllBills(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  const { memberNickname, billType, settlementStatus, billNo } = filters;
  const params = [];
  let whereClause = 'WHERE 1=1';
  
  if (memberNickname) {
    whereClause += ' AND m.nickname LIKE ?';
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
  
  if (billNo) {
    whereClause += ' AND b.bill_no LIKE ?';
    params.push(`%${billNo}%`);
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
        b.*,
        m.nickname as member_nickname,
        t.task_name,
        rm.nickname as related_member_nickname,
        g.group_name as related_group_name,
        st.id as submitted_id,
        w.username as waiter_username
      FROM bills b
      JOIN members m ON b.member_id = m.id
      LEFT JOIN tasks t ON b.task_id = t.id
      LEFT JOIN members rm ON b.related_member_id = rm.id
      LEFT JOIN \`groups\` g ON b.related_group_id = g.id
      LEFT JOIN submitted_tasks st ON (b.task_id = st.task_id AND b.related_member_id = st.member_id)
      LEFT JOIN waiters w ON b.waiter_id = w.id
      ${whereClause}
      ORDER BY b.update_time DESC
      LIMIT ?, ?`,
      [...params, offset, parseInt(pageSize, 10)]
    );
    
    // 格式化账单列表
    const formattedList = rows.map(row => formatBill(row));
    
    return {
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      list: formattedList
    };
  } catch (error) {
    logger.error(`获取所有账单列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createBill,
  getMemberBills,
  getAllBills
}; 