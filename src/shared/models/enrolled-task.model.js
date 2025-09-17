/**
 * 已报名任务模型
 * 处理任务报名相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const groupModel = require('./group.model');
const { convertToCamelCase } = require('../utils/data.util');
const { formatTask } = require('./task.model');

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
    startTime: formatDateTime(enrolledTask.start_time),
    endTime: formatDateTime(enrolledTask.end_time),
  });
  
  // 独立任务没有任务组信息
  formattedEnrolledTask.taskGroup = null;
  
  return formattedEnrolledTask;
}

/**
 * 创建任务报名记录
 * @param {Object} enrollData - 报名数据
 * @param {number} enrollData.taskId - 任务ID
 * @param {number} enrollData.memberId - 会员ID
 * @param {string} enrollData.brandKeywords - 品牌关键词（可选）
 * @returns {Promise<Object>} 创建结果
 */
async function create(enrollData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 验证任务是否存在且状态为进行中
    const [tasks] = await connection.query(
      'SELECT id, task_status, user_range, task_count, group_mode, group_ids, channel_id FROM tasks WHERE id = ?',
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
    
    // 检查用户是否有对应渠道的账号
    const [userAccounts] = await connection.query(
      'SELECT id, account_audit_status FROM accounts WHERE member_id = ? AND channel_id = ?',
      [enrollData.memberId, tasks[0].channel_id]
    );
    
    if (userAccounts.length === 0) {
      throw new Error('请先添加对应渠道的账号');
    }
    
    // 检查账号是否已通过审核
    const approvedAccount = userAccounts.find(account => account.account_audit_status === 'approved');
    if (!approvedAccount) {
      throw new Error('您在该渠道的账号尚未通过审核，请等待审核通过后再报名');
    }
    
    // 检查是否已经报名过
    const [existingEnrolls] = await connection.query(
      'SELECT id FROM enrolled_tasks WHERE task_id = ? AND member_id = ?',
      [enrollData.taskId, enrollData.memberId]
    );
    
    if (existingEnrolls.length > 0) {
      throw new Error('已经报名过该任务');
    }
    
    // 检查任务组顺序逻辑
    const [taskGroupRows] = await connection.query(
      'SELECT task_group_id FROM task_task_groups WHERE task_id = ?',
      [enrollData.taskId]
    );
    
    let taskGroupId = null;
    if (taskGroupRows.length > 0) {
      taskGroupId = taskGroupRows[0].task_group_id;
      
      // 获取任务组信息
      const [taskGroupInfo] = await connection.query(
        'SELECT related_tasks FROM task_groups WHERE id = ?',
        [taskGroupId]
      );
      
      if (taskGroupInfo.length > 0 && taskGroupInfo[0].related_tasks) {
        let relatedTasks = [];
        try {
          if (Array.isArray(taskGroupInfo[0].related_tasks)) {
            relatedTasks = taskGroupInfo[0].related_tasks;
          } else if (typeof taskGroupInfo[0].related_tasks === 'string') {
            relatedTasks = JSON.parse(taskGroupInfo[0].related_tasks);
          }
        } catch (error) {
          logger.error(`解析任务组related_tasks失败: ${error.message}`);
          relatedTasks = [];
        }
        
        // 检查当前任务在任务组中的位置
        const currentTaskIndex = relatedTasks.indexOf(enrollData.taskId);
        if (currentTaskIndex > 0) {
          // 不是第一个任务，需要检查前一个任务是否已完成
          const previousTaskId = relatedTasks[currentTaskIndex - 1];
          
          // 检查前一个任务是否已完成
          const [previousTaskStatus] = await connection.query(
            'SELECT task_audit_status FROM submitted_tasks WHERE task_id = ? AND member_id = ? AND task_audit_status = ?',
            [previousTaskId, enrollData.memberId, 'approved']
          );
          
          if (previousTaskStatus.length === 0) {
            throw new Error('请先完成任务组中的前置任务');
          }
        }
      }
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
        // 预处理group_ids，确保格式正确
        let groupIdsStr = String(tasks[0].group_ids || '[]');
        if (groupIdsStr && !groupIdsStr.startsWith('[') && !groupIdsStr.startsWith('{')) {
          // 如果不是JSON格式，转换为JSON数组格式
          groupIdsStr = `[${groupIdsStr}]`;
        }
        groupIds = JSON.parse(groupIdsStr);
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
    
    // 插入报名记录，包含关联的群组ID和品牌关键词
    const [result] = await connection.query(
      'INSERT INTO enrolled_tasks (task_id, member_id, related_group_id, brand_keywords) VALUES (?, ?, ?, ?)',
      [enrollData.taskId, enrollData.memberId, relatedGroupId, enrollData.brandKeywords || null]
    );
    
    // 如果任务属于任务组，需要在enrolled_task_groups表中记录
    if (taskGroupId) {
      // 检查是否已经报名过该任务组
      const [existingTaskGroupEnroll] = await connection.query(
        'SELECT id FROM enrolled_task_groups WHERE task_group_id = ? AND member_id = ?',
        [taskGroupId, enrollData.memberId]
      );
      
      // 如果没有报名过该任务组，则插入记录
      if (existingTaskGroupEnroll.length === 0) {
        await connection.query(
          'INSERT INTO enrolled_task_groups (task_group_id, member_id) VALUES (?, ?)',
          [taskGroupId, enrollData.memberId]
        );
      }
    }
    
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
      LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
    `;
    
    // 如果需要排除已提交的任务，添加LEFT JOIN到submitted_tasks表
    if (filters.excludeSubmitted) {
      query += `
        LEFT JOIN submitted_tasks st ON et.task_id = st.task_id AND et.member_id = st.member_id
      `;
    }
    
    query += ' WHERE ttg.task_id IS NULL';
    
    let countQuery = 'SELECT COUNT(*) as total FROM enrolled_tasks et LEFT JOIN tasks t ON et.task_id = t.id LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id';
    
    // 如果需要排除已提交的任务，添加LEFT JOIN到submitted_tasks表
    if (filters.excludeSubmitted) {
      countQuery += `
        LEFT JOIN submitted_tasks st ON et.task_id = st.task_id AND et.member_id = st.member_id
      `;
    }
    
    countQuery += ' WHERE ttg.task_id IS NULL';
    
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
    
    // 查询已报名的任务组（未完成且未完全提交）
    let taskGroups = [];
    if (filters.memberId) {
      const taskGroupQuery = `
        SELECT 
          etg.*,
          tg.task_group_name,
          tg.task_group_reward,
          tg.related_tasks,
          (SELECT COALESCE(SUM(rt.reward), 0) 
           FROM tasks rt 
           WHERE JSON_CONTAINS(tg.related_tasks, CAST(rt.id AS JSON))
          ) as related_tasks_reward_sum
        FROM enrolled_task_groups etg
        LEFT JOIN task_groups tg ON etg.task_group_id = tg.id
        WHERE etg.member_id = ? 
        AND etg.completion_status = 'incomplete'
        AND NOT (
          etg.submit_task_ids IS NOT NULL 
          AND JSON_LENGTH(etg.submit_task_ids) > 0
          AND JSON_LENGTH(tg.related_tasks) > 0
          AND (
            SELECT COUNT(*)
            FROM JSON_TABLE(tg.related_tasks, '$[*]' COLUMNS (task_id INT PATH '$')) AS rt
            WHERE JSON_CONTAINS(etg.submit_task_ids, CAST(rt.task_id AS JSON))
          ) = JSON_LENGTH(tg.related_tasks)
        )
        ORDER BY etg.enroll_time DESC
      `;
      
      const [taskGroupRows] = await pool.query(taskGroupQuery, [filters.memberId]);
      
      // 格式化任务组数据
      taskGroups = taskGroupRows.map(row => {
        const formattedTaskGroup = convertToCamelCase({
          ...row,
          enrollTime: formatDateTime(row.enroll_time),
          createTime: formatDateTime(row.create_time),
          updateTime: formatDateTime(row.update_time)
        });
        
        // 计算总奖励
        const taskGroupReward = parseFloat(row.task_group_reward) || 0;
        const relatedTasksRewardSum = parseFloat(row.related_tasks_reward_sum) || 0;
        formattedTaskGroup.allReward = taskGroupReward + relatedTasksRewardSum;
        formattedTaskGroup.relatedTasksRewardSum = relatedTasksRewardSum;
        
        // 安全解析 related_tasks JSON 字段
        try {
          if (Array.isArray(row.related_tasks)) {
            formattedTaskGroup.relatedTasks = row.related_tasks;
          } else if (typeof row.related_tasks === 'string' && row.related_tasks.trim()) {
            formattedTaskGroup.relatedTasks = JSON.parse(row.related_tasks);
          } else {
            formattedTaskGroup.relatedTasks = [];
          }
        } catch (error) {
          logger.error(`解析任务组 related_tasks 失败: ${error.message}, 原始值: ${row.related_tasks}`);
          formattedTaskGroup.relatedTasks = [];
        }
        
        return formattedTaskGroup;
      });
      
      // 为每个任务组获取关联任务详情列表
      for (const taskGroup of taskGroups) {
        if (taskGroup.relatedTasks && taskGroup.relatedTasks.length > 0) {
          try {
            // 获取关联任务的详细信息
            const relatedTaskIds = taskGroup.relatedTasks;
            const placeholders = relatedTaskIds.map(() => '?').join(', ');
            const orderField = relatedTaskIds.map(() => '?').join(', ');
            
            const [relatedTasksResult] = await pool.query(
              `SELECT t.*, c.name as channel_name, c.icon as channel_icon,
                (SELECT COUNT(*) FROM submitted_tasks st WHERE st.task_id = t.id AND task_audit_status != "rejected" AND task_pre_audit_status != "rejected") as submitted_count
               FROM tasks t
               LEFT JOIN channels c ON t.channel_id = c.id
               WHERE t.id IN (${placeholders})
               ORDER BY FIELD(t.id, ${orderField})`,
              [...relatedTaskIds, ...relatedTaskIds]
            );
            
            // 格式化关联任务列表
            const relatedTasksList = relatedTasksResult.map(relatedTask => {
              const formattedRelatedTask = formatTask(relatedTask);
              return formattedRelatedTask;
            });
            
            // 添加到任务组信息中
            taskGroup.relatedTasksList = relatedTasksList;
          } catch (error) {
            logger.error(`获取任务组关联任务详情失败 - 任务组ID: ${taskGroup.taskGroupId}, 错误: ${error.message}`);
            // 如果获取失败，设置为空数组
            taskGroup.relatedTasksList = [];
          }
        } else {
          // 如果没有关联任务，设置为空数组
          taskGroup.relatedTasksList = [];
        }
      }
    }
    
    return {
      total,
      list: formattedList,
      taskGroups: taskGroups,
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
 * @returns {Promise<Object>} 包含是否已报名、报名ID和品牌关键词的对象
 */
async function checkEnrollment(taskId, memberId) {
  try {
    const parsedTaskId = parseInt(taskId, 10);
    const parsedMemberId = parseInt(memberId, 10);
        
    const [rows] = await pool.query(
      'SELECT id, brand_keywords FROM enrolled_tasks WHERE task_id = ? AND member_id = ?',
      [parsedTaskId, parsedMemberId]
    );
    
    const isEnrolled = rows.length > 0;
    const enrollmentId = isEnrolled ? rows[0].id : null;
    const brandKeywords = isEnrolled ? (rows[0].brand_keywords || '') : '';
    
    logger.info(`报名状态检查结果 - 任务ID: ${parsedTaskId}, 会员ID: ${parsedMemberId}, 是否已报名: ${isEnrolled}, 报名ID: ${enrollmentId}, 品牌关键词: ${brandKeywords}`);
    
    return {
      isEnrolled,
      enrollmentId,
      brandKeywords
    };
  } catch (error) {
    logger.error(`检查会员是否已报名任务失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  create,
  getListByMember,
  checkEnrollment,
  formatEnrolledTask
}; 