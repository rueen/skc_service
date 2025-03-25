/**
 * 已报名任务模型
 * 处理任务报名相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const groupModel = require('./group.model');

/**
 * 格式化已报名任务信息
 * @param {Object} enrolledTask - 已报名任务信息
 * @returns {Object} 格式化后的已报名任务信息
 */
function formatEnrolledTask(enrolledTask) {
  if (!enrolledTask) return null;
  
  // 提取基本字段
  const formattedTask = { ...enrolledTask };
  
  // 格式化时间字段，使用驼峰命名法
  formattedTask.enrollTime = formatDateTime(enrolledTask.enroll_time);
  formattedTask.createTime = formatDateTime(enrolledTask.create_time);
  formattedTask.updateTime = formatDateTime(enrolledTask.update_time);
  
  // 转换字段名称为驼峰命名法
  formattedTask.taskId = enrolledTask.task_id;
  formattedTask.memberId = enrolledTask.member_id;
  
  return formattedTask;
}

/**
 * 创建任务报名记录
 * @param {Object} enrollData - 报名数据
 * @param {number} enrollData.taskId - 任务ID
 * @param {number} enrollData.memberId - 会员ID
 * @returns {Promise<Object>} 创建结果
 */
async function create(enrollData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 验证任务是否存在且状态为进行中
    const [tasks] = await connection.query(
      'SELECT id, task_status FROM tasks WHERE id = ?',
      [enrollData.taskId]
    );
    
    if (tasks.length === 0) {
      throw new Error('任务不存在');
    }
    
    if (tasks[0].task_status !== 'processing') {
      throw new Error('只能报名进行中的任务');
    }
    
    // 验证会员是否存在
    const [members] = await connection.query(
      'SELECT id FROM members WHERE id = ?',
      [enrollData.memberId]
    );
    
    if (members.length === 0) {
      throw new Error('会员不存在');
    }
    
    // 检查是否已经报名过
    const [existingEnrolls] = await connection.query(
      'SELECT id FROM enrolled_tasks WHERE task_id = ? AND member_id = ?',
      [enrollData.taskId, enrollData.memberId]
    );
    
    if (existingEnrolls.length > 0) {
      throw new Error('已经报名过该任务');
    }
    
    // 获取会员的第一个群组ID
    let relatedGroupId = null;
    try {
      const memberGroup = await groupModel.getMemberFirstGroup(enrollData.memberId);
      if (memberGroup) {
        relatedGroupId = memberGroup.groupId;
      }
    } catch (error) {
      logger.warn(`获取会员群组失败，将不记录群组ID: ${error.message}`);
    }
    
    // 插入报名记录，包含关联的群组ID
    const [result] = await connection.query(
      'INSERT INTO enrolled_tasks (task_id, member_id, related_group_id) VALUES (?, ?, ?)',
      [enrollData.taskId, enrollData.memberId, relatedGroupId]
    );
    
    await connection.commit();
    
    return { id: result.insertId, relatedGroupId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建任务报名失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取会员已报名任务列表
 * @param {Object} filters - 筛选条件
 * @param {number} filters.memberId - 会员ID
 * @param {number} filters.taskId - 任务ID (可选)
 * @param {boolean} filters.excludeSubmitted - 是否排除已提交的任务 (可选，默认false)
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 任务列表和总数
 */
async function getListByMember(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = `
      SELECT 
        et.id,
        et.task_id,
        et.member_id,
        et.enroll_time,
        et.create_time,
        et.update_time,
        t.task_name, 
        t.reward, 
        t.task_status, 
        t.start_time, 
        t.end_time, 
        t.category,
        t.task_type,
        c.name as channel_name,
        c.icon as channel_icon
      FROM enrolled_tasks et
      LEFT JOIN tasks t ON et.task_id = t.id
      LEFT JOIN channels c ON t.channel_id = c.id
    `;
    
    // 如果需要排除已提交的任务，添加LEFT JOIN到submitted_tasks表
    if (filters.excludeSubmitted) {
      query += `
        LEFT JOIN submitted_tasks st ON et.task_id = st.task_id AND et.member_id = st.member_id
      `;
    }
    
    query += ' WHERE 1=1';
    
    let countQuery = 'SELECT COUNT(*) as total FROM enrolled_tasks et';
    
    // 如果需要排除已提交的任务，添加LEFT JOIN到submitted_tasks表
    if (filters.excludeSubmitted) {
      countQuery += `
        LEFT JOIN submitted_tasks st ON et.task_id = st.task_id AND et.member_id = st.member_id
      `;
    }
    
    countQuery += ' WHERE 1=1';
    
    const queryParams = [];
    
    // 添加筛选条件
    if (filters.memberId) {
      query += ' AND et.member_id = ?';
      countQuery += ' AND et.member_id = ?';
      queryParams.push(filters.memberId);
    }
    
    if (filters.taskId) {
      query += ' AND et.task_id = ?';
      countQuery += ' AND et.task_id = ?';
      queryParams.push(filters.taskId);
    }
    
    // 如果需要排除已提交的任务
    if (filters.excludeSubmitted) {
      query += ' AND st.id IS NULL';
      countQuery += ' AND st.id IS NULL';
    }
    
    // 添加排序和分页
    query += ' ORDER BY et.enroll_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    const total = countResult[0].total;
    
    // 格式化任务列表，只保留驼峰命名格式字段
    const formattedList = rows.map(row => {
      // 创建只包含驼峰格式字段的对象
      return {
        id: row.id,
        taskId: row.task_id,
        memberId: row.member_id,
        enrollTime: formatDateTime(row.enroll_time),
        createTime: formatDateTime(row.create_time),
        updateTime: formatDateTime(row.update_time),
        taskName: row.task_name,
        reward: row.reward,
        taskStatus: row.task_status,
        startTime: formatDateTime(row.start_time),
        endTime: formatDateTime(row.end_time),
        category: row.category,
        taskType: row.task_type,
        channelName: row.channel_name,
        channelIcon: row.channel_icon
      };
    });
    
    return {
      total,
      list: formattedList,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取已报名任务列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查会员是否已报名任务并返回报名详情
 * @param {number} taskId - 任务ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 包含是否已报名和报名ID的对象
 */
async function checkEnrollment(taskId, memberId) {
  try {
    const parsedTaskId = parseInt(taskId, 10);
    const parsedMemberId = parseInt(memberId, 10);
    
    logger.debug(`检查报名状态 - 任务ID: ${parsedTaskId}, 会员ID: ${parsedMemberId}`);
    
    const [rows] = await pool.query(
      'SELECT id FROM enrolled_tasks WHERE task_id = ? AND member_id = ?',
      [parsedTaskId, parsedMemberId]
    );
    
    const isEnrolled = rows.length > 0;
    const enrollmentId = isEnrolled ? rows[0].id : null;
    
    logger.info(`报名状态检查结果 - 任务ID: ${parsedTaskId}, 会员ID: ${parsedMemberId}, 是否已报名: ${isEnrolled}, 报名ID: ${enrollmentId}`);
    
    return {
      isEnrolled,
      enrollmentId
    };
  } catch (error) {
    logger.error(`检查会员是否已报名任务失败: ${error.message}`);
    throw error;
  }
}

/**
 * 取消任务报名
 * @param {number} taskId - 任务ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<boolean>} 是否成功取消
 */
async function cancel(taskId, memberId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const parsedTaskId = parseInt(taskId, 10);
    const parsedMemberId = parseInt(memberId, 10);
    
    // 验证是否已报名
    const [enrolls] = await connection.query(
      'SELECT id FROM enrolled_tasks WHERE task_id = ? AND member_id = ?',
      [parsedTaskId, parsedMemberId]
    );
    
    if (enrolls.length === 0) {
      throw new Error('未报名该任务');
    }
    
    // 删除报名记录
    const [result] = await connection.query(
      'DELETE FROM enrolled_tasks WHERE task_id = ? AND member_id = ?',
      [parsedTaskId, parsedMemberId]
    );
    
    await connection.commit();
    
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`取消任务报名失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  create,
  getListByMember,
  checkEnrollment,
  cancel,
  formatEnrolledTask
}; 