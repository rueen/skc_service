/**
 * 任务模型
 * 处理任务相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化任务信息
 * @param {Object} task - 任务信息
 * @returns {Object} 格式化后的任务信息
 */
function formatTask(task) {
  if (!task) return null;

  // 转换字段名称为驼峰命名法
  const formattedTask = convertToCamelCase({
    ...task,
    startTime: formatDateTime(task.start_time),
    endTime: formatDateTime(task.end_time),
    createTime: formatDateTime(task.create_time),
    updateTime: formatDateTime(task.update_time),
  });
  
  // 移除重复的任务组字段，因为我们将使用 taskGroup 对象
  delete formattedTask.taskGroupId;
  delete formattedTask.taskGroupName;
  delete formattedTask.taskGroupReward;
  delete formattedTask.relatedTasks;
  delete formattedTask.relatedTasksRewardSum;
  
  // 安全解析 JSON 字段
  try {
    // 检查 group_ids 是否已经是数组
    if (Array.isArray(task.group_ids)) {
      formattedTask.groupIds = task.group_ids;
    } else if (typeof task.group_ids === 'string' && task.group_ids.trim()) {
      formattedTask.groupIds = JSON.parse(task.group_ids);
    } else {
      formattedTask.groupIds = [];
    }
  } catch (error) {
    logger.error(`解析 group_ids 失败: ${error.message}, 原始值: ${task.group_ids}`);
    formattedTask.groupIds = [];
  }
  
  // 安全解析 JSON 字段
  try {
    // 检查 custom_fields 是否已经是数组
    if (Array.isArray(task.custom_fields)) {
      formattedTask.customFields = task.custom_fields;
    } else if (typeof task.custom_fields === 'string' && task.custom_fields.trim()) {
      formattedTask.customFields = JSON.parse(task.custom_fields);
    } else {
      formattedTask.customFields = [];
    }
  } catch (error) {
    logger.error(`解析 custom_fields 失败: ${error.message}, 原始值: ${task.custom_fields}`);
    formattedTask.customFields = [];
  }
  
  formattedTask.unlimitedQuota = task.unlimited_quota === 1;
  
  // 计算剩余名额
  if (formattedTask.unlimitedQuota) {
    formattedTask.remainingQuota = null; // 无限名额
  } else if (task.submitted_count !== undefined) {
    // 剩余名额 = 总名额 - 已提交数量
    formattedTask.remainingQuota = Math.max(0, formattedTask.quota - task.submitted_count);
  }
  
  // 添加任务组信息
  if (task.task_group_id && task.task_group_name) {
    const taskGroupReward = parseFloat(task.task_group_reward) || 0;
    const relatedTasksRewardSum = parseFloat(task.related_tasks_reward_sum) || 0;
    
    formattedTask.taskGroup = {
      id: task.task_group_id,
      taskGroupName: task.task_group_name,
      taskGroupReward: taskGroupReward,
      relatedTasksRewardSum: relatedTasksRewardSum,
      allReward: taskGroupReward + relatedTasksRewardSum
    };
    
    // 安全解析 related_tasks JSON 字段
    try {
      if (Array.isArray(task.related_tasks)) {
        formattedTask.taskGroup.relatedTasks = task.related_tasks;
      } else if (typeof task.related_tasks === 'string' && task.related_tasks.trim()) {
        formattedTask.taskGroup.relatedTasks = JSON.parse(task.related_tasks);
      } else {
        formattedTask.taskGroup.relatedTasks = [];
      }
    } catch (error) {
      logger.error(`解析任务组 related_tasks 失败: ${error.message}, 原始值: ${task.related_tasks}`);
      formattedTask.taskGroup.relatedTasks = [];
    }
  } else {
    formattedTask.taskGroup = null;
  }
  
  return formattedTask;
}

/**
 * 将 ISO 格式的日期时间字符串转换为 MySQL 兼容的格式
 * @param {string} dateTimeString - ISO 格式的日期时间字符串
 * @returns {string} MySQL 兼容的日期时间字符串
 */
function formatDateTimeForMySQL(dateTimeString) {
  if (!dateTimeString) return null;
  
  try {
    // 解析日期时间字符串，保留原始时区
    // 格式化为 MySQL 兼容的格式: YYYY-MM-DD HH:MM:SS
    // 直接替换 T 和 Z 以保留原始时间，不进行时区转换
    return dateTimeString.replace('T', ' ').replace(/\.\d+Z$/, '').replace('Z', '');
  } catch (error) {
    logger.error(`日期时间格式转换失败: ${error.message}, 原始值: ${dateTimeString}`);
    return null;
  }
}

/**
 * 获取任务列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {number} memberId - 会员ID (可选)，用于查询是否已报名
 * @param {Object} sortOptions - 排序选项 { field: 'startTime', order: 'ascend' }
 * @returns {Promise<Object>} 包含列表、总数、页码、页大小的对象
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, memberId = null, sortOptions = {}, withRelatedTasksList = false) {
  try {
    // 提前获取会员完成任务次数和群组信息，用于后续构建SQL查询条件
    let memberCompletedTaskCount = null;
    let memberGroups = null;
    
    if (memberId) {
      // 获取会员完成任务次数
      const taskStatsModel = require('./task-stats.model');
      try {
        memberCompletedTaskCount = await taskStatsModel.getMemberCompletedTaskCount(memberId);
        logger.debug(`会员已完成任务次数 - 会员ID: ${memberId}, 完成次数: ${memberCompletedTaskCount}`);
      } catch (error) {
        logger.error(`获取会员完成任务次数失败 - 会员ID: ${memberId}, 错误: ${error.message}`);
        memberCompletedTaskCount = 0;
      }

      // 获取会员所在的群组
      const groupModel = require('./group.model');
      try {
        memberGroups = await groupModel.getMemberGroups(memberId);
        logger.debug(`获取会员群组 - 会员ID: ${memberId}, 群组数: ${memberGroups ? memberGroups.length : 0}`);
      } catch (error) {
        logger.error(`获取会员群组失败 - 会员ID: ${memberId}, 错误: ${error.message}`);
        memberGroups = [];
      }
    }

    let query = `
      SELECT t.*, c.name as channel_name, c.icon as channel_icon,
        tg.id as task_group_id, tg.task_group_name, tg.task_group_reward, tg.related_tasks,
        (SELECT COUNT(*) FROM submitted_tasks st WHERE st.task_id = t.id AND task_audit_status != "rejected" AND task_pre_audit_status != "rejected") as submitted_count,
        (SELECT COALESCE(SUM(rt.reward), 0) 
         FROM tasks rt 
         WHERE JSON_CONTAINS(tg.related_tasks, CAST(rt.id AS JSON))
        ) as related_tasks_reward_sum
      FROM tasks t
      LEFT JOIN channels c ON t.channel_id = c.id
      LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
      LEFT JOIN task_groups tg ON ttg.task_group_id = tg.id
    `;
    
    let countQuery = `SELECT COUNT(DISTINCT t.id) as total FROM tasks t
      LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
      LEFT JOIN task_groups tg ON ttg.task_group_id = tg.id`;
    const queryParams = [];
    const conditions = [];

    // 添加基本筛选条件
    if (filters.taskName) {
      conditions.push('t.task_name LIKE ?');
      queryParams.push(`%${filters.taskName}%`);
    }
    
    if (filters.taskStatus) {
      conditions.push('t.task_status = ?');
      queryParams.push(filters.taskStatus);
    }
    
    // 支持多个任务状态筛选
    if (filters.taskStatusIn && Array.isArray(filters.taskStatusIn) && filters.taskStatusIn.length > 0) {
      const placeholders = filters.taskStatusIn.map(() => '?').join(', ');
      conditions.push(`t.task_status IN (${placeholders})`);
      queryParams.push(...filters.taskStatusIn);
    }
    
    if (filters.channelId) {
      conditions.push('t.channel_id = ?');
      queryParams.push(filters.channelId);
    }
    
    // 支持按任务ID列表筛选
    if (filters.taskIds && Array.isArray(filters.taskIds) && filters.taskIds.length > 0) {
      const placeholders = filters.taskIds.map(() => '?').join(', ');
      conditions.push(`t.id IN (${placeholders})`);
      queryParams.push(...filters.taskIds);
    }
    
    // 按任务组ID筛选
    if (filters.taskGroupId) {
      conditions.push('tg.id = ?');
      queryParams.push(filters.taskGroupId);
    }
    
    // H5端任务组过滤：只显示不属于任务组的任务，或者属于任务组且是首位任务的任务
    if (filters.applyTaskGroupFilter) {
      conditions.push(`(
        ttg.task_id IS NULL OR 
        (ttg.task_id IS NOT NULL AND JSON_EXTRACT(tg.related_tasks, '$[0]') = t.id)
      )`);
    }
    
    // 如果提供了会员ID，过滤掉已报名的任务
    if (memberId) {
      const enrolledTasksCondition = `NOT EXISTS (
        SELECT 1 FROM enrolled_tasks et 
        WHERE et.task_id = t.id AND et.member_id = ?
      )`;
      conditions.push(enrolledTasksCondition);
      queryParams.push(memberId);
      
      // 基于会员完成任务次数的筛选（用户范围筛选）
      if (memberCompletedTaskCount !== null) {
        // 1. 如果是新人任务(userRange=1 & taskCount=0)，且会员已完成任务，则过滤掉
        // 2. 如果是限制任务(userRange=1 & taskCount>0)，且会员完成次数>限制，则过滤掉
        conditions.push(`(
          t.user_range = 0 OR
          (t.user_range = 1 AND t.task_count = 0 AND ? = 0) OR
          (t.user_range = 1 AND t.task_count > 0 AND ? <= t.task_count)
        )`);
        queryParams.push(memberCompletedTaskCount, memberCompletedTaskCount);
      }
      
      // 添加群组模式筛选
      if (memberGroups !== null) {
        // 转换会员群组ID为集合，方便检查
        const memberGroupIds = memberGroups.map(g => g.id);
        if (memberGroupIds.length > 0) {
          // 1. 如果不是群组模式任务(group_mode=0)，则显示
          // 2. 如果是群组模式任务(group_mode=1)，会员必须在至少一个指定群组中
          conditions.push(`(
            t.group_mode = 0 OR 
            (t.group_mode = 1 AND (
              t.group_ids = '[]' OR 
              JSON_OVERLAPS(t.group_ids, JSON_ARRAY(${memberGroupIds.join(',')}))
            ))
          )`);
        } else {
          // 如果会员不在任何群组中，则只显示非群组模式的任务
          conditions.push(`(t.group_mode = 0 OR (t.group_mode = 1 AND t.group_ids = '[]'))`);
        }
      }
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 获取总数
    const [countResult] = await pool.query(countQuery, queryParams);
    const total = countResult[0].total;

    // 如果总数为0，直接返回空结果
    if (total === 0) {
      return {
        list: [],
        total: 0,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10)
      };
    }

    // 添加排序和分页
    let orderByClause = ' ORDER BY t.create_time DESC'; // 默认按创建时间倒序
    
    if (sortOptions.field && sortOptions.order) {
      // 字段映射，将前端字段名映射到数据库字段名
      const fieldMap = {
        'startTime': 't.start_time',
        'endTime': 't.end_time',
        'createTime': 't.create_time',
        'updateTime': 't.update_time',
        'reward': 't.reward',
        'taskName': 't.task_name'
      };
      
      const dbField = fieldMap[sortOptions.field];
      if (dbField) {
        const direction = sortOptions.order === 'ascend' ? 'ASC' : 'DESC';
        orderByClause = ` ORDER BY ${dbField} ${direction}`;
      }
    }
    
    query += orderByClause + ' LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 安全处理每个任务记录
    const formattedList = [];
    
    for (const task of rows) {
      try {
        // 使用formatTask格式化任务数据
        const formattedTask = formatTask(task);
        const taskId = formattedTask.id;
        
        // 初始化报名状态
        let isEnrolled = false;
        let enrollmentId = null;
        
        // 如果提供了会员ID，设置报名状态为false（因为已报名的已被SQL过滤）
        if (memberId) {
          isEnrolled = false; // 已报名的已被SQL过滤
          enrollmentId = null;
          logger.debug(`任务列表项 - 任务ID: ${taskId}, 会员ID: ${memberId}, 是否已报名: ${isEnrolled}`);
        }
        
        formattedTask.isEnrolled = isEnrolled;
        formattedTask.enrollmentId = enrollmentId;
        formattedTask.submittedCount = parseInt(task.submitted_count || 0, 10);
        
        formattedList.push(formattedTask);
      } catch (error) {
        logger.error(`格式化任务失败，任务ID: ${task.id}, 错误: ${error.message}`);
        // 跳过这条记录，继续处理其他记录
      }
    }
    
    if (withRelatedTasksList) {
      // 为有任务组的任务获取关联任务详情列表
      for (const task of formattedList) {
        if (task.taskGroup && task.taskGroup.relatedTasks && task.taskGroup.relatedTasks.length > 0) {
          try {
            // 获取关联任务的详细信息
            const relatedTaskIds = task.taskGroup.relatedTasks;
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
              formattedRelatedTask.submittedCount = parseInt(relatedTask.submitted_count || 0, 10);
              
              // 为关联任务添加报名状态（如果有会员ID）
              formattedRelatedTask.isEnrolled = false;
              formattedRelatedTask.enrollmentId = null;
              
              return formattedRelatedTask;
            });
            
            // 添加到任务组信息中
            task.taskGroup.relatedTasksList = relatedTasksList;
            
            logger.debug(`获取关联任务详情成功 - 任务ID: ${task.id}, 关联任务数量: ${relatedTasksList.length}`);
          } catch (error) {
            logger.error(`获取关联任务详情失败 - 任务ID: ${task.id}, 错误: ${error.message}`);
            // 如果获取失败，设置为空数组
            task.taskGroup.relatedTasksList = [];
          }
        } else if (task.taskGroup) {
          // 如果有任务组但没有关联任务，设置为空数组
          task.taskGroup.relatedTasksList = [];
        }
      }
    }
    
    return {
      list: formattedList,
      total: total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取任务详情
 * @param {number} id - 任务ID
 * @param {number} memberId - 会员ID (可选)，用于查询是否已报名
 * @returns {Promise<Object>} 任务详情
 */
async function getDetail(id, memberId = null) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.name as channel_name, c.icon as channel_icon,
        tg.id as task_group_id, tg.task_group_name, tg.task_group_reward, tg.related_tasks,
        (SELECT COUNT(*) FROM submitted_tasks st WHERE st.task_id = t.id AND task_audit_status != "rejected" AND task_pre_audit_status != "rejected") as submitted_count,
        (SELECT COALESCE(SUM(rt.reward), 0) 
         FROM tasks rt 
         WHERE JSON_CONTAINS(tg.related_tasks, CAST(rt.id AS JSON))
        ) as related_tasks_reward_sum
       FROM tasks t
       LEFT JOIN channels c ON t.channel_id = c.id
       LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
       LEFT JOIN task_groups tg ON ttg.task_group_id = tg.id
       WHERE t.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const task = formatTask(rows[0]);
    
    // 如果有群组ID，获取群组名称
    if (task.groupIds && task.groupIds.length > 0) {
      try {
        // 使用 MySQL 的 IN 查询
        const placeholders = task.groupIds.map(() => '?').join(',');
        const [groups] = await pool.query(
          `SELECT id, group_name FROM \`groups\` WHERE id IN (${placeholders})`,
          task.groupIds
        );
        
        task.groups = groups.map(group => ({
          id: group.id,
          groupName: group.group_name
        }));
      } catch (error) {
        logger.error(`获取任务关联群组失败，任务ID: ${id}, 错误: ${error.message}`);
        task.groups = [];
      }
    } else {
      task.groups = [];
    }
    
    // 如果提供了会员ID，获取会员完成任务次数
    let memberCompletedTaskCount = null;
    if (memberId) {
      try {
        const taskStatsModel = require('./task-stats.model');
        memberCompletedTaskCount = await taskStatsModel.getMemberCompletedTaskCount(memberId);
        logger.debug(`会员已完成任务次数 - 会员ID: ${memberId}, 完成次数: ${memberCompletedTaskCount}`);
      } catch (error) {
        logger.error(`获取会员完成任务次数失败 - 会员ID: ${memberId}, 错误: ${error.message}`);
        memberCompletedTaskCount = 0;
      }
    }
    
    // 添加会员是否符合任务条件
    task.eligibleToEnroll = true; // 默认可以报名
    
    // 如果是限制任务且有会员ID，判断是否符合条件
    if (memberId && task.userRange === 1 && memberCompletedTaskCount !== null) {
      if (task.taskCount === 0) {
        // 新人任务：只有未完成任务的新会员可以报名
        task.eligibleToEnroll = memberCompletedTaskCount === 0;
      } else {
        // 普通任务：只有完成次数不超过taskCount的会员可以报名
        task.eligibleToEnroll = memberCompletedTaskCount <= task.taskCount;
      }
      
      // 如果不符合条件，添加提示信息
      if (!task.eligibleToEnroll) {
        task.ineligibleReason = `该任务限已完成${task.taskCount}次任务的会员可报名`;
      }
    }
    
    // 检查指定群组的任务，判断会员是否有资格报名
    if (memberId && task.groupMode === 1 && task.groupIds && task.groupIds.length > 0) {
      try {
        const groupModel = require('./group.model');
        // 检查会员是否在这些群组中
        const isMemberInGroups = await groupModel.isMemberInGroups(memberId, task.groupIds);
        
        if (!isMemberInGroups) {
          // 会员不在指定群组中，不能报名
          task.eligibleToEnroll = false;
          task.ineligibleReason = '该任务仅限指定群组的会员可报名';
          logger.debug(`会员不在指定群组中 - 会员ID: ${memberId}, 任务ID: ${id}`);
        }
      } catch (error) {
        logger.error(`检查会员是否在指定群组中失败 - 会员ID: ${memberId}, 任务ID: ${id}, 错误: ${error.message}`);
        // 发生错误时默认不可报名，以保证安全
        task.eligibleToEnroll = false;
        task.ineligibleReason = '无法验证群组信息，请稍后再试';
      }
    }
    
    // 如果提供了会员ID，检查是否已报名
    if (memberId) {
      try {
        // 直接使用enrolled-task模型的checkEnrollment函数
        const enrolledTaskModel = require('./enrolled-task.model');
        const enrollmentResult = await enrolledTaskModel.checkEnrollment(task.id, memberId);
        
        task.isEnrolled = enrollmentResult.isEnrolled;
        task.enrollmentId = enrollmentResult.enrollmentId;
        
        // 记录日志，用于调试报名状态
        logger.info(`任务详情(使用checkEnrollment) - 任务ID: ${id}, 会员ID: ${memberId}, 是否已报名: ${task.isEnrolled}, 报名ID: ${task.enrollmentId}`);
      } catch (error) {
        logger.error(`检查任务报名状态失败: ${error.message}`);
        task.isEnrolled = false;
        task.enrollmentId = null;
      }
      
      // 检查任务是否已提交
      try {
        const [submittedResult] = await pool.query(
          'SELECT id, task_audit_status FROM submitted_tasks WHERE task_id = ? AND member_id = ?',
          [id, memberId]
        );
        
        task.isSubmitted = submittedResult.length > 0;
        task.submittedId = task.isSubmitted ? submittedResult[0].id : null;
        task.taskAuditStatus = task.isSubmitted ? submittedResult[0].task_audit_status : null;
        
        // 记录日志，用于调试提交状态
        logger.info(`任务详情(提交状态) - 任务ID: ${id}, 会员ID: ${memberId}, 是否已提交: ${task.isSubmitted}, 提交ID: ${task.submittedId || '无'}`);
      } catch (error) {
        logger.error(`检查任务提交状态失败: ${error.message}`);
        task.isSubmitted = false;
        task.submittedId = null;
        task.taskAuditStatus = null;
      }
    } else {
      task.isEnrolled = false;
      task.enrollmentId = null;
      task.isSubmitted = false;
      task.submittedId = null;
      task.taskAuditStatus = null;
    }
    
    // 获取报名人数
    const [enrollCountResult] = await pool.query(
      'SELECT COUNT(*) as count FROM enrolled_tasks WHERE task_id = ?',
      [id]
    );
    task.enrollCount = enrollCountResult[0].count;
    
    return task;
  } catch (error) {
    logger.error(`获取任务详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建任务
 * @param {Object} taskData - 任务数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(taskData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查渠道是否存在
    const [channel] = await connection.query(
      'SELECT id FROM channels WHERE id = ?',
      [taskData.channelId]
    );
    
    if (channel.length === 0) {
      throw new Error('所选渠道不存在');
    }
    
    // 检查群组是否存在
    if (taskData.groupIds && taskData.groupIds.length > 0) {
      const [groups] = await connection.query(
        'SELECT COUNT(*) as count FROM `groups` WHERE id IN (?)',
        [taskData.groupIds]
      );
      
      if (groups[0].count !== taskData.groupIds.length) {
        throw new Error('部分所选群组不存在');
      }
    }
    
    // 处理 userRange 和 taskCount 的关系
    const userRange = taskData.userRange;
    let taskCount = taskData.taskCount || 0;
    
    // 如果 userRange 为 0（全部用户），则 taskCount 设为 0
    if (userRange === 0) {
      taskCount = 0;
    } else if (userRange === 1) {
      // 如果 userRange 为 1，确保 taskCount 是非负整数
      if (taskCount === undefined || taskCount === null) {
        throw new Error('当用户范围为1时，完成任务次数不能为空');
      }
      
      if (!Number.isInteger(Number(taskCount)) || Number(taskCount) < 0) {
        throw new Error('完成任务次数必须是非负整数');
      }
    } else {
      throw new Error('用户范围必须是0或1');
    }
    
    // 处理 groupMode，确保是 0 或 1
    let groupMode = taskData.groupMode;
    if (groupMode !== 0 && groupMode !== 1) {
      // 如果不是有效值，则根据 groupIds 判断
      groupMode = (taskData.groupIds && taskData.groupIds.length > 0) ? 1 : 0;
    }
    
    // 安全处理 JSON 数据
    let groupIdsJson = '[]';
    let customFieldsJson = '[]';
    
    try {
      groupIdsJson = JSON.stringify(taskData.groupIds || []);
    } catch (error) {
      logger.error(`序列化 groupIds 失败: ${error.message}`);
      groupIdsJson = '[]';
    }
    
    try {
      customFieldsJson = JSON.stringify(taskData.customFields || []);
    } catch (error) {
      logger.error(`序列化 customFields 失败: ${error.message}`);
      customFieldsJson = '[]';
    }
    
    // 格式化日期时间为 MySQL 兼容格式
    const startTime = formatDateTimeForMySQL(taskData.startTime);
    const endTime = formatDateTimeForMySQL(taskData.endTime);
    
    // 处理 quota 字段
    const quota = taskData.quota !== undefined ? taskData.quota : 0;
    
    // 创建任务
    const [result] = await connection.query(
      `INSERT INTO tasks 
       (task_name, channel_id, category, task_type, reward, brand, 
        group_ids, group_mode, user_range, task_count, custom_fields, 
        start_time, end_time, unlimited_quota, quota, fans_required, 
        content_requirement, task_info, notice, task_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskData.taskName,
        taskData.channelId,
        taskData.category,
        taskData.taskType,
        taskData.reward,
        taskData.brand,
        groupIdsJson,
        groupMode,
        userRange,
        taskCount,
        customFieldsJson,
        startTime,
        endTime,
        taskData.unlimitedQuota ? 1 : 0,
        quota,
        taskData.fansRequired || null,
        taskData.contentRequirement || null,
        taskData.taskInfo || null,
        taskData.notice || null,
        taskData.taskStatus || 'not_started'
      ]
    );
    
    await connection.commit();
    return { id: result.insertId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建任务失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新任务
 * @param {Object} taskData - 任务数据
 * @returns {Promise<boolean>} 更新是否成功
 */
async function update(taskData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查任务是否存在
    const [existingTask] = await connection.query(
      'SELECT id, user_range FROM tasks WHERE id = ?',
      [taskData.id]
    );
    
    if (existingTask.length === 0) {
      throw new Error('任务不存在');
    }
    
    // 获取当前任务的 userRange
    const currentUserRange = existingTask[0].user_range;
    
    // 检查渠道是否存在
    if (taskData.channelId) {
      const [channel] = await connection.query(
        'SELECT id FROM channels WHERE id = ?',
        [taskData.channelId]
      );
      
      if (channel.length === 0) {
        throw new Error('所选渠道不存在');
      }
    }
    
    // 检查群组是否存在
    if (taskData.groupIds && taskData.groupIds.length > 0) {
      const [groups] = await connection.query(
        'SELECT COUNT(*) as count FROM `groups` WHERE id IN (?)',
        [taskData.groupIds]
      );
      
      if (groups[0].count !== taskData.groupIds.length) {
        throw new Error('部分所选群组不存在');
      }
    }
    
    // 处理 userRange 和 taskCount 的关系
    let userRange = taskData.userRange;
    let taskCount = taskData.taskCount;
    
    // 如果更新了 userRange
    if (userRange !== undefined) {
      if (userRange !== 0 && userRange !== 1) {
        throw new Error('用户范围必须是0或1');
      }
      
      // 如果 userRange 为 0（全部用户），则 taskCount 设为 0
      if (userRange === 0) {
        taskCount = 0;
      } else if (userRange === 1 && taskCount === undefined) {
        // 如果 userRange 为 1 但没有提供 taskCount，则获取当前的 taskCount
        const [currentTask] = await connection.query(
          'SELECT task_count FROM tasks WHERE id = ?',
          [taskData.id]
        );
        
        if (currentTask.length > 0) {
          taskCount = currentTask[0].task_count;
        } else {
          throw new Error('当用户范围为1时，完成任务次数不能为空');
        }
      }
    } else if (taskCount !== undefined) {
      // 如果只更新了 taskCount，需要检查当前的 userRange
      if (currentUserRange === 0) {
        // 如果当前 userRange 为 0，则忽略 taskCount 的更新
        taskCount = 0;
      } else if (currentUserRange === 1) {
        // 如果当前 userRange 为 1，确保 taskCount 是非负整数
        if (!Number.isInteger(Number(taskCount)) || Number(taskCount) < 0) {
          throw new Error('完成任务次数必须是非负整数');
        }
      }
    }
    
    // 构建更新语句
    const updateFields = [];
    const params = [];
    
    if (taskData.taskName !== undefined) {
      updateFields.push('task_name = ?');
      params.push(taskData.taskName);
    }
    
    if (taskData.channelId !== undefined) {
      updateFields.push('channel_id = ?');
      params.push(taskData.channelId);
    }
    
    if (taskData.category !== undefined) {
      updateFields.push('category = ?');
      params.push(taskData.category);
    }
    
    if (taskData.taskType !== undefined) {
      updateFields.push('task_type = ?');
      params.push(taskData.taskType);
    }
    
    if (taskData.reward !== undefined) {
      updateFields.push('reward = ?');
      params.push(taskData.reward);
    }
    
    if (taskData.brand !== undefined) {
      updateFields.push('brand = ?');
      params.push(taskData.brand);
    }
    
    if (taskData.groupIds !== undefined) {
      try {
        const groupIdsJson = JSON.stringify(taskData.groupIds || []);
        updateFields.push('group_ids = ?');
        params.push(groupIdsJson);
      } catch (error) {
        logger.error(`序列化 groupIds 失败: ${error.message}`);
        // 使用空数组作为默认值
        updateFields.push('group_ids = ?');
        params.push('[]');
      }
    }
    
    if (taskData.groupMode !== undefined) {
      // 确保 groupMode 是 0 或 1
      let groupMode = taskData.groupMode;
      if (groupMode !== 0 && groupMode !== 1) {
        // 如果不是有效值，则根据 groupIds 判断
        if (taskData.groupIds !== undefined) {
          groupMode = (taskData.groupIds && taskData.groupIds.length > 0) ? 1 : 0;
        } else {
          // 如果没有提供 groupIds，则获取当前的 groupIds
          const [currentTask] = await connection.query(
            'SELECT group_ids FROM tasks WHERE id = ?',
            [taskData.id]
          );
          
          if (currentTask.length > 0) {
            try {
              const currentGroupIds = JSON.parse(currentTask[0].group_ids || '[]');
              groupMode = (currentGroupIds && currentGroupIds.length > 0) ? 1 : 0;
            } catch (error) {
              logger.error(`解析当前 group_ids 失败: ${error.message}`);
              groupMode = 0;
            }
          } else {
            groupMode = 0;
          }
        }
      }
      
      updateFields.push('group_mode = ?');
      params.push(groupMode);
    }
    
    if (userRange !== undefined) {
      updateFields.push('user_range = ?');
      params.push(userRange);
    }
    
    if (taskCount !== undefined) {
      updateFields.push('task_count = ?');
      params.push(taskCount);
    }
    
    if (taskData.customFields !== undefined) {
      try {
        const customFieldsJson = JSON.stringify(taskData.customFields || []);
        updateFields.push('custom_fields = ?');
        params.push(customFieldsJson);
      } catch (error) {
        logger.error(`序列化 customFields 失败: ${error.message}`);
        // 使用空数组作为默认值
        updateFields.push('custom_fields = ?');
        params.push('[]');
      }
    }
    
    if (taskData.startTime !== undefined) {
      const formattedStartTime = formatDateTimeForMySQL(taskData.startTime);
      updateFields.push('start_time = ?');
      params.push(formattedStartTime);
    }
    
    if (taskData.endTime !== undefined) {
      const formattedEndTime = formatDateTimeForMySQL(taskData.endTime);
      updateFields.push('end_time = ?');
      params.push(formattedEndTime);
    }
    
    if (taskData.unlimitedQuota !== undefined) {
      updateFields.push('unlimited_quota = ?');
      params.push(taskData.unlimitedQuota ? 1 : 0);
    }
    
    if (taskData.quota !== undefined) {
      updateFields.push('quota = ?');
      params.push(taskData.quota);
    }
    
    if (taskData.fansRequired !== undefined) {
      updateFields.push('fans_required = ?');
      params.push(taskData.fansRequired);
    }
    
    if (taskData.contentRequirement !== undefined) {
      updateFields.push('content_requirement = ?');
      params.push(taskData.contentRequirement);
    }
    
    if (taskData.taskInfo !== undefined) {
      updateFields.push('task_info = ?');
      params.push(taskData.taskInfo);
    }
    
    if (taskData.notice !== undefined) {
      updateFields.push('notice = ?');
      params.push(taskData.notice);
    }
    
    if (taskData.taskStatus !== undefined) {
      updateFields.push('task_status = ?');
      params.push(taskData.taskStatus);
    }
    
    if (updateFields.length === 0) {
      return true; // 没有需要更新的字段
    }
    
    params.push(taskData.id);
    
    // 更新任务信息
    await connection.query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新任务失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除任务
 * @param {number} id - 任务ID
 * @returns {Promise<boolean>} 删除是否成功
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查任务是否存在
    const [task] = await connection.query(
      'SELECT id FROM tasks WHERE id = ?',
      [id]
    );
    
    if (task.length === 0) {
      throw new Error('任务不存在');
    }
    
    // 检查是否有关联的已提交任务
    const [submitted] = await connection.query(
      'SELECT COUNT(*) as count FROM submitted_tasks WHERE task_id = ?',
      [id]
    );
    
    if (submitted[0].count > 0) {
      throw new Error('该任务下存在已提交记录，无法删除');
    }
    
    // 删除任务
    const [result] = await connection.query(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除任务失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove
}; 