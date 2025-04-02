/**
 * 已报名任务模型
 * 处理任务报名相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const groupModel = require('./group.model');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化已报名任务信息
 * @param {Object} enrolledTask - 已报名任务信息
 * @returns {Object} 格式化后的已报名任务信息
 */
function formatEnrolledTask(enrolledTask) {
  if (!enrolledTask) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedEnrolledTask = convertToCamelCase({
    ...enrolledTask,
    enrollTime: formatDateTime(enrolledTask.enroll_time),
    createTime: formatDateTime(enrolledTask.create_time),
    updateTime: formatDateTime(enrolledTask.update_time),
  });
  
  return formattedEnrolledTask;
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
      'SELECT id, task_status, user_range, task_count, group_mode, group_ids FROM tasks WHERE id = ?',
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
    
    // 检查会员是否符合任务完成次数要求
    if (tasks[0].user_range === 1) {
      // 获取会员完成任务次数
      const taskStatsModel = require('./task-stats.model');
      const completedTaskCount = await taskStatsModel.getMemberCompletedTaskCount(enrollData.memberId);
      
      if (tasks[0].task_count === 0) {
        // 新人任务：只允许从未完成过任务的会员报名
        if (completedTaskCount > 0) {
          throw new Error(`该任务限未完成过任务的会员可报名`);
        }
      } else {
        // 普通任务：只允许完成次数不超过taskCount的会员报名
        if (completedTaskCount > tasks[0].task_count) {
          throw new Error(`该任务限已完成${tasks[0].task_count}次任务的会员可报名`);
        }
      }
    }
    
    // 检查指定群组的任务，验证会员是否在指定群组中
    if (tasks[0].group_mode === 1) {
      // 解析group_ids
      let groupIds = [];
      try {
        groupIds = JSON.parse(tasks[0].group_ids || '[]');
      } catch (err) {
        logger.error(`解析任务群组IDs失败 - 任务ID: ${enrollData.taskId}, 错误: ${err.message}`);
        groupIds = [];
      }
      
      // 如果任务有指定群组
      if (groupIds.length > 0) {
        // 检查会员是否在这些群组中
        const groupModel = require('./group.model');
        const isMemberInGroups = await groupModel.isMemberInGroups(enrollData.memberId, groupIds);
        
        if (!isMemberInGroups) {
          // 会员不在指定群组中，不能报名
          throw new Error('该任务仅限指定群组的会员可报名');
        }
      }
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
        et.*,
        t.task_name, 
        t.reward, 
        t.task_status, 
        t.start_time, 
        t.end_time, 
        t.category,
        t.task_type,
        t.fans_required,
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
    
    // 使用 formatEnrolledTask 方法格式化每一行数据
    const formattedList = rows.map(row => formatEnrolledTask(row));
    
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