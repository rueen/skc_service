/**
 * 已提交任务模型
 * 处理任务提交相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');

/**
 * 创建任务提交记录
 * @param {Object} submitData - 提交数据
 * @param {number} submitData.taskId - 任务ID
 * @param {number} submitData.memberId - 会员ID
 * @param {Object} submitData.submitContent - 提交内容
 * @returns {Promise<Object>} 创建结果
 */
async function create(submitData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 验证任务是否存在
    const [tasks] = await connection.query(
      'SELECT id, task_status FROM tasks WHERE id = ?',
      [submitData.taskId]
    );
    
    if (tasks.length === 0) {
      throw new Error('任务不存在');
    }
    
    if (tasks[0].task_status !== 'processing') {
      throw new Error('只能提交进行中的任务');
    }
    
    // 验证会员是否存在
    const [members] = await connection.query(
      'SELECT id FROM members WHERE id = ?',
      [submitData.memberId]
    );
    
    if (members.length === 0) {
      throw new Error('会员不存在');
    }
    
    // 验证会员是否已报名该任务
    const [enrolls] = await connection.query(
      'SELECT id FROM enrolled_tasks WHERE task_id = ? AND member_id = ?',
      [submitData.taskId, submitData.memberId]
    );
    
    if (enrolls.length === 0) {
      throw new Error('请先报名任务');
    }
    
    // 检查是否已经提交过
    const [existingSubmits] = await connection.query(
      'SELECT id, task_audit_status FROM submitted_tasks WHERE task_id = ? AND member_id = ?',
      [submitData.taskId, submitData.memberId]
    );
    
    // 如果已提交且状态为 pending 或 approved，则不允许再次提交
    if (existingSubmits.length > 0) {
      const status = existingSubmits[0].task_audit_status;
      if (status === 'pending') {
        throw new Error('任务已提交，正在审核中');
      } else if (status === 'approved') {
        throw new Error('任务已提交并已通过审核');
      } else {
        // 如果是rejected状态，则更新现有记录
        await connection.query(
          `UPDATE submitted_tasks 
           SET submit_content = ?, submit_time = NOW(), task_audit_status = 'pending', reject_reason = NULL 
           WHERE id = ?`,
          [JSON.stringify(submitData.submitContent), existingSubmits[0].id]
        );
        
        await connection.commit();
        return { id: existingSubmits[0].id, isResubmit: true };
      }
    }
    
    // 插入提交记录
    const [result] = await connection.query(
      `INSERT INTO submitted_tasks 
       (task_id, member_id, submit_content, task_audit_status) 
       VALUES (?, ?, ?, 'pending')`,
      [submitData.taskId, submitData.memberId, JSON.stringify(submitData.submitContent)]
    );
    
    await connection.commit();
    
    return { id: result.insertId, isResubmit: false };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建任务提交失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取已提交任务列表
 * @param {Object} filters - 筛选条件
 * @param {string} filters.taskName - 任务名称
 * @param {number} filters.channelId - 渠道ID
 * @param {string} filters.taskAuditStatus - 审核状态
 * @param {number} filters.groupId - 群组ID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 任务列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = `
      SELECT 
        st.id,
        st.task_id,
        st.member_id,
        st.submit_time,
        st.task_audit_status,
        st.waiter_id,
        st.reject_reason,
        st.submit_content,
        t.task_name,
        t.reward,
        t.channel_id,
        c.name as channel_name,
        c.icon as channel_icon,
        m.member_nickname,
        mg.group_id,
        g_table.group_name,
        g_table.owner_id = m.id as is_group_owner
      FROM submitted_tasks st
      LEFT JOIN tasks t ON st.task_id = t.id
      LEFT JOIN channels c ON t.channel_id = c.id
      LEFT JOIN members m ON st.member_id = m.id
      LEFT JOIN member_groups mg ON st.member_id = mg.member_id
      LEFT JOIN \`groups\` g_table ON mg.group_id = g_table.id
      WHERE 1=1
    `;
    
    let countQuery = 'SELECT COUNT(DISTINCT st.id) as total FROM submitted_tasks st';
    let countJoins = `
      LEFT JOIN tasks t ON st.task_id = t.id
      LEFT JOIN members m ON st.member_id = m.id
      LEFT JOIN member_groups mg ON st.member_id = mg.member_id
    `;
    countQuery += countJoins + ' WHERE 1=1';
    
    const queryParams = [];
    
    // 添加筛选条件
    if (filters.taskName) {
      query += ' AND t.task_name LIKE ?';
      countQuery += ' AND t.task_name LIKE ?';
      queryParams.push(`%${filters.taskName}%`);
    }
    
    if (filters.channelId) {
      query += ' AND t.channel_id = ?';
      countQuery += ' AND t.channel_id = ?';
      queryParams.push(filters.channelId);
    }
    
    if (filters.taskAuditStatus) {
      // 检查是否有多个状态值（使用|分隔）
      if (filters.taskAuditStatus.includes('|')) {
        const statuses = filters.taskAuditStatus.split('|').map(s => s.trim());
        const placeholders = statuses.map(() => '?').join(', ');
        query += ` AND st.task_audit_status IN (${placeholders})`;
        countQuery += ` AND st.task_audit_status IN (${placeholders})`;
        queryParams.push(...statuses);
      } else {
        // 单个状态值
        query += ' AND st.task_audit_status = ?';
        countQuery += ' AND st.task_audit_status = ?';
        queryParams.push(filters.taskAuditStatus);
      }
    }
    
    if (filters.groupId) {
      query += ' AND mg.group_id = ?';
      countQuery += ' AND mg.group_id = ?';
      queryParams.push(filters.groupId);
    }
    
    if (filters.memberId) {
      query += ' AND st.member_id = ?';
      countQuery += ' AND st.member_id = ?';
      queryParams.push(filters.memberId);
    }
    
    // 添加排序和分页
    query += ' ORDER BY st.submit_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    const total = countResult[0].total;
    
    // 格式化任务列表，转换为驼峰命名格式
    const formattedList = rows.map(row => {
      // 解析JSON格式的提交内容
      let submitContent = {};
      try {
        if (row.submit_content) {
          // 检查是否已经是对象，避免重复解析
          if (typeof row.submit_content === 'object' && row.submit_content !== null) {
            submitContent = row.submit_content;
          } else if (typeof row.submit_content === 'string') {
            submitContent = JSON.parse(row.submit_content);
          }
        }
      } catch (error) {
        logger.error(`解析提交内容JSON失败: ${error.message}, 原始内容类型: ${typeof row.submit_content}`);
        submitContent = {};
      }
      
      return {
        id: row.id,
        taskId: row.task_id,
        taskName: row.task_name,
        channelId: row.channel_id,
        channelName: row.channel_name,
        channelIcon: row.channel_icon,
        memberId: row.member_id,
        memberNickname: row.member_nickname,
        groupId: row.group_id,
        groupName: row.group_name,
        isGroupOwner: !!row.is_group_owner,
        reward: row.reward,
        submitContent: submitContent,
        submitTime: formatDateTime(row.submit_time),
        taskAuditStatus: row.task_audit_status,
        waiterId: row.waiter_id,
        rejectReason: row.reject_reason
      };
    });
    
    return {
      total,
      list: formattedList,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取已提交任务列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取已提交任务详情
 * @param {number} id - 提交ID
 * @returns {Promise<Object>} 任务提交详情
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        st.id,
        st.task_id,
        st.member_id,
        st.submit_content,
        st.submit_time,
        st.task_audit_status,
        st.waiter_id,
        st.reject_reason,
        t.task_name,
        t.reward
      FROM submitted_tasks st
      LEFT JOIN tasks t ON st.task_id = t.id
      WHERE st.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    // 解析JSON格式的提交内容
    let submitContent = {};
    try {
      if (row.submit_content) {
        // 检查是否已经是对象，避免重复解析
        if (typeof row.submit_content === 'object' && row.submit_content !== null) {
          submitContent = row.submit_content;
        } else if (typeof row.submit_content === 'string') {
          submitContent = JSON.parse(row.submit_content);
        }
      }
    } catch (error) {
      logger.error(`解析提交内容JSON失败: ${error.message}, 原始内容类型: ${typeof row.submit_content}`);
      submitContent = {};
    }
    
    // 格式化为驼峰命名格式
    return {
      id: row.id,
      taskId: row.task_id,
      taskName: row.task_name,
      memberId: row.member_id,
      submitContent,
      submitTime: formatDateTime(row.submit_time),
      taskAuditStatus: row.task_audit_status,
      waiterId: row.waiter_id,
      rejectReason: row.reject_reason,
      reward: row.reward
    };
  } catch (error) {
    logger.error(`获取已提交任务详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量审核通过任务
 * @param {Array<number>} ids - 提交ID数组
 * @param {number} waiterId - 审核员ID
 * @returns {Promise<Object>} 操作结果
 */
async function batchApprove(ids, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 更新任务状态为已通过
    const [result] = await connection.query(
      `UPDATE submitted_tasks 
       SET task_audit_status = 'approved', waiter_id = ? 
       WHERE id IN (?) AND task_audit_status = 'pending'`,
      [waiterId, ids]
    );
    
    // 获取已通过任务的关联信息，用于生成账单
    const [tasks] = await connection.query(
      `SELECT 
        st.id, st.task_id, st.member_id, t.reward
      FROM submitted_tasks st
      JOIN tasks t ON st.task_id = t.id
      WHERE st.id IN (?) AND st.task_audit_status = 'approved'`,
      [ids]
    );
    
    // 任务收入账单记录
    for (const task of tasks) {
      // 创建任务完成收入记录
      await connection.query(
        `INSERT INTO bills 
         (member_id, amount, bill_type, settlement_status, related_id, remark) 
         VALUES (?, ?, 'task_income', 'settled', ?, ?)`,
        [
          task.member_id,
          task.reward,
          task.id,
          `完成任务[ID:${task.task_id}]收入`
        ]
      );
      
      // TODO: 群组奖励计算逻辑（后续补充）
      // 1. 检查任务是否设置了群组奖励比例
      // 2. 检查会员是否属于某个群组
      // 3. 检查群主是否是会员本人
      // 4. 计算群主奖励金额
      // 5. 如果有奖励，创建群主奖励记录
    }
    
    await connection.commit();
    
    return {
      success: true,
      updatedCount: result.affectedRows
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`批量审核通过任务失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 批量拒绝任务
 * @param {Array<number>} ids - 提交ID数组
 * @param {string} reason - 拒绝原因
 * @param {number} waiterId - 审核员ID
 * @returns {Promise<Object>} 操作结果
 */
async function batchReject(ids, reason, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 更新任务状态为已拒绝
    const [result] = await connection.query(
      `UPDATE submitted_tasks 
       SET task_audit_status = 'rejected', reject_reason = ?, waiter_id = ? 
       WHERE id IN (?) AND task_audit_status = 'pending'`,
      [reason, waiterId, ids]
    );
    
    await connection.commit();
    
    return {
      success: true,
      updatedCount: result.affectedRows
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`批量拒绝任务失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 根据会员ID和任务ID获取任务提交
 * @param {number} taskId - 任务ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 任务提交详情
 */
async function getByTaskAndMember(taskId, memberId) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id,
        task_id,
        member_id,
        submit_content,
        submit_time,
        task_audit_status,
        waiter_id,
        reject_reason
      FROM submitted_tasks 
      WHERE task_id = ? AND member_id = ?`,
      [taskId, memberId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    // 解析JSON格式的提交内容
    let submitContent = {};
    try {
      if (row.submit_content) {
        // 检查是否已经是对象，避免重复解析
        if (typeof row.submit_content === 'object' && row.submit_content !== null) {
          submitContent = row.submit_content;
        } else if (typeof row.submit_content === 'string') {
          submitContent = JSON.parse(row.submit_content);
        }
      }
    } catch (error) {
      logger.error(`解析提交内容JSON失败: ${error.message}, 原始内容类型: ${typeof row.submit_content}`);
      submitContent = {};
    }
    
    // 格式化为驼峰命名格式
    return {
      id: row.id,
      taskId: row.task_id,
      memberId: row.member_id,
      submitContent,
      submitTime: formatDateTime(row.submit_time),
      taskAuditStatus: row.task_audit_status,
      waiterId: row.waiter_id,
      rejectReason: row.reject_reason
    };
  } catch (error) {
    logger.error(`根据会员ID和任务ID获取任务提交失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  create,
  getList,
  getById,
  batchApprove,
  batchReject,
  getByTaskAndMember
}; 