/**
 * 已提交任务模型
 * 处理任务提交相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const rewardModel = require('./reward.model');
const groupModel = require('./group.model');
const { convertToCamelCase } = require('../utils/data.util');
const memberModel = require('./member.model');
const { formatTask } = require('./task.model');

function formatSubmittedTask(submittedTask) {
  if (!submittedTask) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedSubmittedTask = convertToCamelCase({
    ...submittedTask,
    submitTime: formatDateTime(submittedTask.submit_time),
    taskPreAuditStatus: submittedTask.task_pre_audit_status,
    taskAuditStatus: submittedTask.task_audit_status,
    preAuditTime: formatDateTime(submittedTask.pre_audit_time),
    auditTime: formatDateTime(submittedTask.audit_time),
    createTime: formatDateTime(submittedTask.create_time),
    updateTime: formatDateTime(submittedTask.update_time),
    startTime: formatDateTime(submittedTask.start_time),
    endTime: formatDateTime(submittedTask.end_time)
  });
  
  // 移除重复的任务组字段，因为我们将使用 taskGroup 对象
  delete formattedSubmittedTask.taskGroupId;
  delete formattedSubmittedTask.taskGroupName;
  delete formattedSubmittedTask.taskGroupReward;
  delete formattedSubmittedTask.relatedTasks;
  delete formattedSubmittedTask.relatedTasksRewardSum;
  
  // 添加任务组信息
  if (submittedTask.task_group_id && submittedTask.task_group_name) {
    const taskGroupReward = parseFloat(submittedTask.task_group_reward) || 0;
    const relatedTasksRewardSum = parseFloat(submittedTask.related_tasks_reward_sum) || 0;
    
    formattedSubmittedTask.taskGroup = {
      id: submittedTask.task_group_id,
      taskGroupName: submittedTask.task_group_name,
      taskGroupReward: taskGroupReward,
      relatedTasksRewardSum: relatedTasksRewardSum,
      allReward: taskGroupReward + relatedTasksRewardSum
    };
    
    // 安全解析 related_tasks JSON 字段
    try {
      if (Array.isArray(submittedTask.related_tasks)) {
        formattedSubmittedTask.taskGroup.relatedTasks = submittedTask.related_tasks;
      } else if (typeof submittedTask.related_tasks === 'string' && submittedTask.related_tasks.trim()) {
        formattedSubmittedTask.taskGroup.relatedTasks = JSON.parse(submittedTask.related_tasks);
      } else {
        formattedSubmittedTask.taskGroup.relatedTasks = [];
      }
    } catch (error) {
      logger.error(`解析任务组 related_tasks 失败: ${error.message}, 原始值: ${submittedTask.related_tasks}`);
      formattedSubmittedTask.taskGroup.relatedTasks = [];
    }
  } else {
    formattedSubmittedTask.taskGroup = null;
  }
  
  return formattedSubmittedTask;
}

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
    
    // 验证任务是否存在，并使用 FOR UPDATE 锁定行防止并发问题
    const [tasks] = await connection.query(
      'SELECT id, task_status, unlimited_quota, quota FROM tasks WHERE id = ? FOR UPDATE',
      [submitData.taskId]
    );
    
    if (tasks.length === 0) {
      throw new Error('任务不存在');
    }
    
    const task = tasks[0];
    
    if (task.task_status !== 'processing') {
      throw new Error('只能提交进行中的任务');
    }
    
    // 检查任务名额
    if (task.unlimited_quota !== 1) {  // 如果不是无限名额
      // 获取当前有效提交数量，添加FOR UPDATE锁防止并发问题
      const [submitCount] = await connection.query(
        'SELECT COUNT(*) as count FROM submitted_tasks WHERE task_id = ? AND task_audit_status != "rejected" AND task_pre_audit_status != "rejected" FOR UPDATE',
        [submitData.taskId]
      );
      
      const currentSubmitCount = submitCount[0].count;
      
      // 如果已达到名额上限，则拒绝提交
      if (currentSubmitCount >= task.quota) {
        throw new Error('任务名额已满，无法提交');
      }
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
      'SELECT id, task_audit_status, task_pre_audit_status, reject_times FROM submitted_tasks WHERE task_id = ? AND member_id = ?',
      [submitData.taskId, submitData.memberId]
    );
    
    // 获取会员的第一个群组ID
    let relatedGroupId = null;
    try {
      const memberGroup = await groupModel.getMemberFirstGroup(submitData.memberId);
      if (memberGroup) {
        relatedGroupId = memberGroup.groupId;
      }
    } catch (error) {
      logger.warn(`获取会员群组失败，将不记录群组ID: ${error.message}`);
    }
    
    // 如果已提交，检查状态来决定是否允许重新提交
    if (existingSubmits.length > 0) {
      const auditStatus = existingSubmits[0].task_audit_status;
      const preAuditStatus = existingSubmits[0].task_pre_audit_status;
      
      // 检查任务驳回次数限制的内部函数
      const checkRejectTimesLimit = async () => {
        const [systemConfigRows] = await connection.query(
          'SELECT config_value FROM system_config WHERE config_key = ?',
          ['task_reject_times']
        );
        
        const maxRejectTimes = systemConfigRows.length > 0 ? parseInt(systemConfigRows[0].config_value, 10) : -1;
        
        // 如果系统配置不为-1（不限制），则检查驳回次数
        if (maxRejectTimes !== -1) {
          const currentRejectTimes = existingSubmits[0].reject_times || 0;
          if (currentRejectTimes > maxRejectTimes) {
            throw new Error('h5.task.rejectTimesLimit');
          }
        }
      };
      
      // 重新提交的通用处理函数
      const handleResubmit = async () => {
        await connection.query(
          `UPDATE submitted_tasks 
           SET submit_content = ?, submit_time = NOW(), task_audit_status = 'pending', task_pre_audit_status = 'pending', reject_reason = NULL, related_group_id = ? 
           WHERE id = ?`,
          [JSON.stringify(submitData.submitContent), relatedGroupId, existingSubmits[0].id]
        );
        
        await connection.commit();
        return { id: existingSubmits[0].id, isResubmit: true, relatedGroupId };
      };
      
      // 如果正式审核已通过，不允许重新提交
      if (auditStatus === 'approved') {
        throw new Error('任务已提交并已通过审核');
      } 
      // 如果正式审核状态为pending，但初审被拒绝，允许重新提交（需检查驳回次数）
      else if (auditStatus === 'pending' && preAuditStatus === 'rejected') {
        await checkRejectTimesLimit();
        return await handleResubmit();
      }
      // 如果正式审核状态为pending，初审状态不是rejected，不允许重新提交
      else if (auditStatus === 'pending' && preAuditStatus !== 'rejected') {
        throw new Error('任务已提交，正在审核中');
      }
      // 如果正式审核状态为rejected，允许重新提交（需检查驳回次数）
      else if (auditStatus === 'rejected') {
        await checkRejectTimesLimit();
        return await handleResubmit();
      }
    }
    
    // 插入提交记录，包含关联的群组ID
    const [result] = await connection.query(
      `INSERT INTO submitted_tasks 
       (task_id, member_id, submit_content, task_audit_status, task_pre_audit_status, related_group_id) 
       VALUES (?, ?, ?, 'pending', 'pending', ?)`,
      [submitData.taskId, submitData.memberId, JSON.stringify(submitData.submitContent), relatedGroupId]
    );
    
    // 检查任务是否属于任务组，如果是首次提交，则更新任务组提交状态
    const [taskGroupRows] = await connection.query(
      'SELECT task_group_id FROM task_task_groups WHERE task_id = ?',
      [submitData.taskId]
    );
    
    if (taskGroupRows.length > 0) {
      const taskGroupId = taskGroupRows[0].task_group_id;
      
      // 获取当前的已提交任务ID列表
      const [currentSubmitTasks] = await connection.query(
        'SELECT submit_task_ids FROM enrolled_task_groups WHERE task_group_id = ? AND member_id = ?',
        [taskGroupId, submitData.memberId]
      );

      if (currentSubmitTasks.length > 0) {
        let submitTaskIds = [];
        
        // 解析当前的已提交任务ID列表
        try {
          if (currentSubmitTasks[0].submit_task_ids) {
            // 确保是数组格式
            if (!Array.isArray(currentSubmitTasks[0].submit_task_ids)) {
              submitTaskIds = JSON.parse(currentSubmitTasks[0].submit_task_ids);
            } else {
              submitTaskIds = currentSubmitTasks[0].submit_task_ids;
            }
          }
        } catch (error) {
          logger.error(`解析已提交任务ID列表失败: ${error.message}`);
          submitTaskIds = [];
        }

        // 检查任务ID是否已存在，避免重复添加
        if (!submitTaskIds.includes(submitData.taskId)) {
          submitTaskIds.push(submitData.taskId);
          
          // 更新任务组提交状态和已提交任务ID列表
          await connection.query(
            'UPDATE enrolled_task_groups SET submit_status = ?, submit_task_ids = ? WHERE task_group_id = ? AND member_id = ?',
            ['submitted', JSON.stringify(submitTaskIds), taskGroupId, submitData.memberId]
          );
          
          logger.info(`任务首次提交，更新任务组提交状态和已提交任务ID列表 - 任务ID: ${submitData.taskId}, 任务组ID: ${taskGroupId}, 会员ID: ${submitData.memberId}, 已提交任务列表: ${JSON.stringify(submitTaskIds)}`);
        } else {
          // 任务ID已存在，只更新提交状态
          await connection.query(
            'UPDATE enrolled_task_groups SET submit_status = ? WHERE task_group_id = ? AND member_id = ?',
            ['submitted', taskGroupId, submitData.memberId]
          );
          
          logger.info(`任务重复提交，仅更新任务组提交状态 - 任务ID: ${submitData.taskId}, 任务组ID: ${taskGroupId}, 会员ID: ${submitData.memberId}`);
        }
      }
    }
    
    await connection.commit();
    
    return { id: result.insertId, isResubmit: false, relatedGroupId };
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
 * @param {string} filters.taskAuditStatus - 审核状态（单一状态）
 * @param {string} filters.taskPreAuditStatus - 预审状态
 * @param {number} filters.groupId - 群组ID
 * @param {number} filters.memberId - 会员ID
 * @param {string} filters.submitStartTime - 提交开始时间
 * @param {string} filters.submitEndTime - 提交结束时间
 * @param {number} filters.completedTaskCount - 已完成任务次数筛选条件
 * @param {number} filters.preWaiterId - 初审员ID
 * @param {number} filters.waiterId - 审核员ID
 * @param {string} filters.keyword - 关键词搜索（昵称或账号）
 * @param {boolean} filters.exportMode - 是否为导出模式，为true时不使用分页
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {Object} sortOptions - 排序选项 { field: 'preAuditTime', order: 'ascend' }
 * @returns {Promise<Object>} 任务列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, sortOptions = {}) {
  try {
    // 构建 WHERE 子句
    let whereClause = '1 = 1';
    const queryParams = [];
    
    // 添加筛选条件
    if (filters.taskName) {
      whereClause += ' AND t.task_name LIKE ?';
      queryParams.push(`%${filters.taskName}%`);
    }
    
    if (filters.channelId) {
      whereClause += ' AND t.channel_id = ?';
      queryParams.push(filters.channelId);
    }
    
    if (filters.memberId) {
      whereClause += ' AND st.member_id = ?';
      queryParams.push(filters.memberId);
    }
    
    if (filters.taskAuditStatus) {
      whereClause += ` AND st.task_audit_status = ?`;
      queryParams.push(filters.taskAuditStatus);
    }
    
    if (filters.taskPreAuditStatus) {
      whereClause += ' AND st.task_pre_audit_status = ?';
      queryParams.push(filters.taskPreAuditStatus);
    }
    
    if (filters.groupId) {
      whereClause += ' AND st.related_group_id = ?';
      queryParams.push(filters.groupId);
    }
    
    if (filters.submitStartTime) {
      whereClause += ' AND st.submit_time >= ?';
      queryParams.push(filters.submitStartTime);
    }
    
    if (filters.submitEndTime) {
      whereClause += ' AND st.submit_time <= ?';
      queryParams.push(filters.submitEndTime);
    }
    
    if (filters.preWaiterId != null) {
      if (filters.preWaiterId == 0) {
        whereClause += ' AND st.pre_waiter_id IS NULL';
      } else {
        whereClause += ' AND st.pre_waiter_id = ?';
        queryParams.push(filters.preWaiterId);
      }
    }
    
    if (filters.waiterId != null) {
      if (filters.waiterId == 0) {
        whereClause += ' AND st.waiter_id IS NULL';
      } else {
        whereClause += ' AND st.waiter_id = ?';
        queryParams.push(filters.waiterId);
      }
    }
    
    // 添加关键词搜索条件（昵称或账号）
    if (filters.keyword) {
      whereClause += ' AND (m.nickname LIKE ? OR m.account LIKE ?)';
      queryParams.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    
    // 添加任务组ID筛选
    if (filters.taskGroupId) {
      whereClause += ' AND tg.id = ?';
      queryParams.push(filters.taskGroupId);
    }
    
    // 添加已完成任务次数筛选条件
    let completedTaskWhere = '';
    if (filters.completedTaskCount) {
      const count = parseInt(filters.completedTaskCount, 10);
      if (!isNaN(count) && count >= 0) {
        completedTaskWhere = ` AND (
          SELECT COUNT(*) 
          FROM submitted_tasks sub
          JOIN tasks tt ON sub.task_id = tt.id
          WHERE sub.member_id = st.member_id 
          AND sub.task_audit_status = 'approved'
        ) = ${count}`;
        // 这里不再需要添加到queryParams，因为count已经直接内联到SQL语句中
      }
    }
    
    // 基本查询，包含统计信息
    const query = `
      SELECT 
        st.*,
        st.pre_audit_time,
        st.audit_time,
        t.task_name,
        t.channel_id,
        t.brand,
        t.reward,
        c.name AS channel_name,
        c.icon AS channel_icon,
        m.nickname,
        m.account,
        m.is_new,
        pre_w.username AS pre_waiter_name,
        w.username AS waiter_name,
        tg.id as task_group_id,
        tg.task_group_name,
        tg.task_group_reward,
        tg.related_tasks,
        (SELECT COALESCE(SUM(rt.reward), 0) 
         FROM tasks rt 
         WHERE JSON_CONTAINS(tg.related_tasks, CAST(rt.id AS JSON))
        ) as related_tasks_reward_sum,
        (
          SELECT COUNT(*) 
          FROM submitted_tasks sub
          JOIN tasks tt ON sub.task_id = tt.id
          WHERE sub.member_id = st.member_id 
          AND sub.task_audit_status = 'approved'
        ) AS completed_task_count
      FROM 
        submitted_tasks st
        JOIN tasks t ON st.task_id = t.id
        JOIN members m ON st.member_id = m.id
        LEFT JOIN channels c ON t.channel_id = c.id
        LEFT JOIN waiters pre_w ON st.pre_waiter_id = pre_w.id
        LEFT JOIN waiters w ON st.waiter_id = w.id
        LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
        LEFT JOIN task_groups tg ON ttg.task_group_id = tg.id
      WHERE ${whereClause} ${completedTaskWhere}
    `;
    
    // 计算总数的查询
    const countQuery = `
      SELECT 
        COUNT(*) AS total,
        COALESCE(SUM(t.reward), 0) AS totalAmount
      FROM 
        submitted_tasks st
        JOIN tasks t ON st.task_id = t.id
        JOIN members m ON st.member_id = m.id
        LEFT JOIN channels c ON t.channel_id = c.id
        LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
        LEFT JOIN task_groups tg ON ttg.task_group_id = tg.id
      WHERE ${whereClause} ${completedTaskWhere}
    `;
    
    // 添加排序
    let orderByClause = ' ORDER BY st.submit_time DESC';
    
    if (sortOptions.field && sortOptions.order) {
      // 字段映射，将前端字段名映射到数据库字段名
      const fieldMap = {
        'preAuditTime': 'st.pre_audit_time',
        'confirmAuditTime': 'st.audit_time'
      };
      
      const dbField = fieldMap[sortOptions.field];
      if (dbField) {
        const direction = sortOptions.order === 'ascend' ? 'ASC' : 'DESC';
        orderByClause = ` ORDER BY ${dbField} ${direction}`;
      }
    }
    
    // 执行查询，添加分页
    let finalQuery = query + orderByClause;
    
    // 仅在非导出模式下添加分页限制
    if (!filters.exportMode) {
      finalQuery += ' LIMIT ?, ?';
      queryParams.push((page - 1) * pageSize, parseInt(pageSize, 10));
    }
    
    const [rows] = await pool.query(finalQuery, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams);
    
    const total = countResult[0].total;
    const totalAmount = parseFloat(countResult[0].totalAmount) || 0;
    
    // 使用 formatSubmittedTask 方法格式化结果
    const formattedList = rows.map(row => {
      // 解析JSON格式的提交内容
      if (row.submit_content) {
        try {
          // 检查是否已经是对象，避免重复解析
          if (typeof row.submit_content === 'string') {
            row.submit_content = JSON.parse(row.submit_content);
          }
        } catch (error) {
          logger.error(`解析提交内容JSON失败: ${error.message}, 原始内容类型: ${typeof row.submit_content}`);
          row.submit_content = {};
        }
      }
      
      const formattedItem = formatSubmittedTask(row);
      // 添加列表中特有的字段
      formattedItem.completedTaskCount = parseInt(row.completed_task_count || 0, 10);
      
      return formattedItem;
    });
    
    // 获取相关会员的群组信息
    if (formattedList.length > 0) {
      // 获取相关会员的群组信息
      const memberIds = [...new Set(formattedList.map(item => item.memberId))].filter(Boolean);
      
      // 查询会员群组信息（仅当有会员ID时）
      const memberGroupsMap = {};
      if (memberIds.length > 0) {
        // 使用 member_groups 关联表查询
        const placeholders = memberIds.map(() => '?').join(',');
        const [memberGroups] = await pool.query(`
          SELECT mg.member_id, mg.group_id, mg.is_owner, mg.join_time,
                 g.*
          FROM member_groups mg
          JOIN \`groups\` g ON mg.group_id = g.id
          WHERE mg.member_id IN (${placeholders})
        `, memberIds);
        
        // 整理群组信息到每个会员下的groups数组中
        memberGroups.forEach(mg => {
          if (!memberGroupsMap[mg.member_id]) {
            memberGroupsMap[mg.member_id] = [];
          }
          
          memberGroupsMap[mg.member_id].push({
            id: mg.id,
            groupId: mg.group_id,
            groupName: mg.group_name,
            groupLink: mg.group_link,
            ownerId: mg.owner_id,
            isOwner: Boolean(mg.is_owner),
            joinTime: formatDateTime(mg.join_time),
            createTime: formatDateTime(mg.create_time),
            updateTime: formatDateTime(mg.update_time)
          });
        });
      }
      
      // 扩展任务提交信息，添加groups数组字段
      formattedList.forEach(item => {
        item.groups = memberGroupsMap[item.memberId] || [];
      });
    }
    
    return {
      total,
      totalAmount,
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
 * 获取预审已通过的任务列表
 * @param {Object} filters - 筛选条件
 * @param {string} filters.taskName - 任务名称
 * @param {number} filters.channelId - 渠道ID
 * @param {string} filters.taskAuditStatus - 审核状态
 * @param {number} filters.groupId - 群组ID
 * @param {string} filters.submitStartTime - 提交开始时间
 * @param {string} filters.submitEndTime - 提交结束时间
 * @param {number} filters.completedTaskCount - 已完成任务次数筛选条件
 * @param {boolean} filters.exportMode - 是否为导出模式，为true时不使用分页
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {Object} sortOptions - 排序选项 { field: 'preAuditTime|confirmAuditTime', order: 'ascend|descend' }
 * @returns {Promise<Object>} 任务列表和总数
 */
async function getPreAuditedList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, sortOptions = {}) {
  // 创建一个新的筛选条件对象，避免修改原始对象
  const newFilters = { ...filters };
  
  // 添加预审已通过的筛选条件
  newFilters.taskPreAuditStatus = 'approved';
  
  // 调用getList方法获取数据
  const result = await getList(newFilters, page, pageSize, sortOptions);
  
  // 确保导出时显示正确的预审状态文本
  if (result && result.list) {
    result.list.forEach(item => {
      if (item.taskPreAuditStatus === 'approved') {
        item.taskPreAuditStatusText = '预审通过';
      }
    });
  }
  
  return result;
}

/**
 * 获取已提交任务详情
 * @param {number} id - 提交ID
 * @param {string} auditType - 审核类型 ('confirm' 或 'pre')
 * @param {Object} filtersParam - 筛选参数
 * @param {string} filtersParam.taskName - 任务名称
 * @param {number} filtersParam.channelId - 渠道ID
 * @param {string} filtersParam.taskPreAuditStatus - 预审状态
 * @param {number} filtersParam.preWaiterId - 初审员ID
 * @param {string} filtersParam.taskAuditStatus - 审核状态
 * @param {number} filtersParam.waiterId - 审核员ID
 * @param {number} filtersParam.groupId - 群组ID
 * @param {number} filtersParam.completedTaskCount - 已完成任务次数
 * @param {string} filtersParam.submitStartTime - 提交开始时间
 * @param {string} filtersParam.submitEndTime - 提交结束时间
 * @returns {Promise<Object>} 任务详情
 */
async function getById(id, auditType = 'confirm', filtersParam = {}) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        st.*,
        st.pre_audit_time,
        st.audit_time,
        t.task_name,
        t.reward,
        pre_w.username as pre_waiter_name,
        w.username as waiter_name
      FROM submitted_tasks st
      LEFT JOIN tasks t ON st.task_id = t.id
      LEFT JOIN waiters pre_w ON st.pre_waiter_id = pre_w.id
      LEFT JOIN waiters w ON st.waiter_id = w.id
      WHERE st.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    // 解析JSON格式的提交内容
    if (row.submit_content) {
      try {
        // 检查是否已经是对象，避免重复解析
        if (typeof row.submit_content === 'string') {
          row.submit_content = JSON.parse(row.submit_content);
        }
      } catch (error) {
        logger.error(`解析提交内容JSON失败: ${error.message}, 原始内容类型: ${typeof row.submit_content}`);
        row.submit_content = {};
      }
    }
    
    // 使用 formatSubmittedTask 格式化数据
    const formattedTask = formatSubmittedTask(row);
    // 添加额外字段
    formattedTask.taskName = row.task_name;
    formattedTask.reward = row.reward;
    formattedTask.preWaiterName = row.pre_waiter_name || '';
    formattedTask.waiterName = row.waiter_name || '';
    
    // 根据审核类型设置审核状态
    formattedTask.auditStatus = auditType === 'pre' ? formattedTask.taskPreAuditStatus : formattedTask.taskAuditStatus;
    
    // 构建获取前后任务的筛选条件
    const filters = { ...filtersParam };
    
    // 构建 WHERE 子句
    let whereClause = '1 = 1';
    const queryParams = [];
    
    // 添加筛选条件
    if (filters.taskName) {
      whereClause += ' AND t.task_name LIKE ?';
      queryParams.push(`%${filters.taskName}%`);
    }
    
    if (filters.channelId) {
      whereClause += ' AND t.channel_id = ?';
      queryParams.push(filters.channelId);
    }
    
    if (filters.taskAuditStatus) {
      whereClause += ' AND st.task_audit_status = ?';
      queryParams.push(filters.taskAuditStatus);
    }
    
    if (filters.taskPreAuditStatus) {
      whereClause += ' AND st.task_pre_audit_status = ?';
      queryParams.push(filters.taskPreAuditStatus);
    }
    
    if (filters.groupId) {
      whereClause += ' AND st.related_group_id = ?';
      queryParams.push(filters.groupId);
    }
    
    if (filters.submitStartTime) {
      whereClause += ' AND st.submit_time >= ?';
      queryParams.push(filters.submitStartTime);
    }
    
    if (filters.submitEndTime) {
      whereClause += ' AND st.submit_time <= ?';
      queryParams.push(filters.submitEndTime);
    }
    
    if (filters.preWaiterId !== undefined) {
      if (filters.preWaiterId == 0) {
        whereClause += ' AND st.pre_waiter_id IS NULL';
      } else {
        whereClause += ' AND st.pre_waiter_id = ?';
        queryParams.push(filters.preWaiterId);
      }
    }
    
    if (filters.waiterId !== undefined) {
      if (filters.waiterId == 0) {
        whereClause += ' AND st.waiter_id IS NULL';
      } else {
        whereClause += ' AND st.waiter_id = ?';
        queryParams.push(filters.waiterId);
      }
    }
    
    // 添加审核类型相关条件
    if (auditType === 'pre') {
      // 预审：获取所有预审任务，使用filtersParam中的筛选条件
    } else {
      // 复审：获取所有预审已通过且复审任务，使用filtersParam中的筛选条件
      whereClause += ' AND st.task_pre_audit_status = "approved"';
    }
    
    // 根据submitTime排序
    const tasksQuery = `
      SELECT st.id, st.submit_time 
      FROM submitted_tasks st
      JOIN tasks t ON st.task_id = t.id
      LEFT JOIN members m ON st.member_id = m.id
      LEFT JOIN channels c ON t.channel_id = c.id
      LEFT JOIN (
        SELECT member_id, group_id, is_owner
        FROM member_groups
        WHERE (member_id, id) IN (
          SELECT member_id, MIN(id)
          FROM member_groups
          GROUP BY member_id
        )
      ) mg ON st.member_id = mg.member_id
      LEFT JOIN \`groups\` g ON mg.group_id = g.id
      WHERE ${whereClause}
      ORDER BY st.submit_time DESC
    `;
    
    const [filteredTasks] = await pool.query(tasksQuery, queryParams);
    
    // 初始化前后任务ID为null
    formattedTask.prevTaskId = null;
    formattedTask.nextTaskId = null;
    
    if (filteredTasks.length > 0) {
      // 查找提交时间比当前任务更新的最接近的任务（前一个任务）
      const currentSubmitTime = new Date(row.submit_time).getTime();
      const newerTasks = filteredTasks.filter(task => 
        new Date(task.submit_time).getTime() > currentSubmitTime
      );
      const newerTask = newerTasks.length > 0 
        ? newerTasks.reduce((closest, task) => 
            new Date(task.submit_time).getTime() < new Date(closest.submit_time).getTime() 
              ? task : closest, newerTasks[0])
        : null;
      
      // 查找提交时间比当前任务更旧的最接近的任务（后一个任务）
      const olderTasks = filteredTasks.filter(task => 
        new Date(task.submit_time).getTime() < currentSubmitTime
      );
      const olderTask = olderTasks.length > 0 
        ? olderTasks.reduce((closest, task) => 
            new Date(task.submit_time).getTime() > new Date(closest.submit_time).getTime() 
              ? task : closest, olderTasks[0])
        : null;
      
      // 设置前一个和后一个任务ID
      if (newerTask) {
        formattedTask.prevTaskId = newerTask.id;
      }
      
      if (olderTask) {
        formattedTask.nextTaskId = olderTask.id;
      }
    }
    
    return formattedTask;
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
    
    // 先查询状态为pending的任务并加排他锁(X锁)，防止并发问题
    const [pendingTasks] = await connection.query(
      `SELECT 
        st.id, st.task_id, st.member_id, st.related_group_id, t.reward
      FROM submitted_tasks st
      JOIN tasks t ON st.task_id = t.id
      WHERE st.id IN (?) AND st.task_audit_status = 'pending'
      FOR UPDATE`,
      [ids]
    );
    
    // 直接获取符合条件的任务ID
    const pendingTaskIds = pendingTasks.map(task => task.id);
    
    if (pendingTaskIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    // 更新任务状态为已通过，只更新pending状态的任务
    const [result] = await connection.query(
      `UPDATE submitted_tasks 
       SET task_audit_status = 'approved', waiter_id = ?, audit_time = NOW() 
       WHERE id IN (?) AND task_audit_status = 'pending'`,
      [waiterId, pendingTaskIds]
    );
    
    // 处理任务奖励
    const rewardResults = [];
    for (const task of pendingTasks) {
      try {
        // 获取任务提交时记录的群组ID
        const relatedGroupId = task.related_group_id;
        logger.info(`处理任务奖励 - 任务ID: ${task.id}, 会员ID: ${task.member_id}, 关联群组ID: ${relatedGroupId}`);
        
        // 在同一个事务中处理奖励，确保数据一致性
        const taskResult = {
          taskReward: null,
          inviteReward: null,
          groupOwnerCommission: null
        };
        
        // 1. 处理任务奖励
        taskResult.taskReward = await rewardModel.processTaskReward({
          submittedTaskId: task.id,
          taskId: task.task_id,
          memberId: task.member_id,
          reward: task.reward,
          relatedGroupId: relatedGroupId
        }, connection);
        
        // 2. 检查是否首次完成任务
        const isFirstCompletion = await memberModel.isNewMember(task.member_id);
        
        // 如果是首次完成，处理邀请奖励
        if (isFirstCompletion) {
          const inviterInfo = await rewardModel.getMemberInviter(task.member_id, connection);
          if (inviterInfo && inviterInfo.inviterId) {
            taskResult.inviteReward = await rewardModel.processInviteReward({
              taskId: task.task_id,
              memberId: task.member_id,
              inviterId: inviterInfo.inviterId,
              relatedGroupId: relatedGroupId
            }, connection);
          }
          
          // 更新会员的新人状态为非新人
          await memberModel.updateIsNewStatus(task.member_id, connection);
          logger.info(`更新会员新人状态 - 会员ID: ${task.member_id} 已不再是新人`);
        } 
        // 如果非首次完成，处理群主收益
        else {
          const groupInfo = await rewardModel.getMemberGroupInfo(task.member_id, connection);
          if (groupInfo && groupInfo.ownerId) {
            // 如果群主不是会员本人，则处理群主收益
            if (groupInfo.ownerId !== task.member_id) {
              taskResult.groupOwnerCommission = await rewardModel.processGroupOwnerCommission({
                taskId: task.task_id,
                memberId: task.member_id,
                ownerId: groupInfo.ownerId,
                reward: task.reward,
                relatedGroupId: relatedGroupId
              }, connection);
            } 
            // 如果群主是会员本人，则也需要处理群主收益
            else {
              taskResult.groupOwnerCommission = await rewardModel.processGroupOwnerCommission({
                taskId: task.task_id,
                memberId: task.member_id,
                ownerId: task.member_id,
                reward: task.reward,
                relatedGroupId: relatedGroupId
              }, connection);
            }
          }
        }
        
        rewardResults.push({
          taskId: task.id,
          result: { success: true, results: taskResult }
        });
      } catch (error) {
        logger.error(`处理任务ID ${task.id} 的奖励失败: ${error.message}`);
        rewardResults.push({
          taskId: task.id,
          error: error.message
        });
      }
    }
    
    await connection.commit();
    
    return {
      success: true,
      updatedCount: result.affectedRows,
      rewardResults
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
    
    // 先查询状态为pending的任务并加排他锁(X锁)，防止并发问题
    const [pendingTasks] = await connection.query(
      `SELECT 
        st.id
      FROM submitted_tasks st
      WHERE st.id IN (?) AND st.task_audit_status = 'pending'
      FOR UPDATE`,
      [ids]
    );
    
    // 直接获取符合条件的任务ID
    const pendingTaskIds = pendingTasks.map(task => task.id);
    
    if (pendingTaskIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    // 更新任务状态为已拒绝，只更新pending状态的任务，并增加驳回次数
    const [result] = await connection.query(
      `UPDATE submitted_tasks 
       SET task_audit_status = 'rejected', reject_reason = ?, waiter_id = ?, audit_time = NOW(), 
           reject_times = reject_times + 1
       WHERE id IN (?) AND task_audit_status = 'pending'`,
      [reason, waiterId, pendingTaskIds]
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
         st.*,
         t.task_name,
         pre_w.username as pre_waiter_name,
         w.username as waiter_name
       FROM submitted_tasks st
       LEFT JOIN tasks t ON st.task_id = t.id
       LEFT JOIN waiters pre_w ON st.pre_waiter_id = pre_w.id
       LEFT JOIN waiters w ON st.waiter_id = w.id
       WHERE st.task_id = ? AND st.member_id = ?`,
      [taskId, memberId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const row = rows[0];
    
    // 解析JSON格式的提交内容
    if (row.submit_content) {
      try {
        // 检查是否已经是对象，避免重复解析
        if (typeof row.submit_content === 'string') {
          row.submit_content = JSON.parse(row.submit_content);
        }
      } catch (error) {
        logger.error(`解析提交内容JSON失败: ${error.message}, 原始内容类型: ${typeof row.submit_content}`);
        row.submit_content = {};
      }
    }
    
    // 使用 formatSubmittedTask 格式化数据
    const formattedTask = formatSubmittedTask(row);
    
    // 添加额外字段
    formattedTask.taskName = row.task_name;
    formattedTask.preWaiterName = row.pre_waiter_name || '';
    formattedTask.waiterName = row.waiter_name || '';
    
    return formattedTask;
  } catch (error) {
    logger.error(`根据会员ID和任务ID获取任务提交失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量预审通过任务
 * @param {Array<number>} ids - 提交ID数组
 * @param {number} waiterId - 审核员ID
 * @returns {Promise<Object>} 操作结果
 */
async function batchPreApprove(ids, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 先查询预审状态为pending的任务并加排他锁(X锁)，防止并发问题
    const [pendingTasks] = await connection.query(
      `SELECT 
        st.id
      FROM submitted_tasks st
      WHERE st.id IN (?) AND st.task_pre_audit_status = 'pending'
      FOR UPDATE`,
      [ids]
    );
    
    // 直接获取符合条件的任务ID
    const pendingTaskIds = pendingTasks.map(task => task.id);
    
    if (pendingTaskIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    // 更新任务预审状态为已通过，只更新预审状态为pending的任务
    const [result] = await connection.query(
      `UPDATE submitted_tasks 
       SET task_pre_audit_status = 'approved', pre_waiter_id = ?, pre_audit_time = NOW() 
       WHERE id IN (?) AND task_pre_audit_status = 'pending'`,
      [waiterId, pendingTaskIds]
    );
    
    await connection.commit();
    
    return {
      success: true,
      updatedCount: result.affectedRows
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`批量预审通过任务失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 批量预审拒绝任务
 * @param {Array<number>} ids - 提交ID数组
 * @param {string} reason - 拒绝原因
 * @param {number} waiterId - 审核员ID
 * @returns {Promise<Object>} 操作结果
 */
async function batchPreReject(ids, reason, waiterId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 先查询预审状态为pending的任务并加排他锁(X锁)，防止并发问题
    const [pendingTasks] = await connection.query(
      `SELECT 
        st.id
      FROM submitted_tasks st
      WHERE st.id IN (?) AND st.task_pre_audit_status = 'pending'
      FOR UPDATE`,
      [ids]
    );
    
    // 直接获取符合条件的任务ID
    const pendingTaskIds = pendingTasks.map(task => task.id);
    if (pendingTaskIds.length === 0) {
      await connection.commit();
      return false;
    }
    
    // 更新任务预审状态为已拒绝，只更新预审状态为pending的任务，并增加驳回次数
    const [result] = await connection.query(
      `UPDATE submitted_tasks 
       SET task_pre_audit_status = 'rejected', reject_reason = ?, pre_waiter_id = ?, pre_audit_time = NOW(), 
           reject_times = reject_times + 1
       WHERE id IN (?) AND task_pre_audit_status = 'pending'`,
      [reason, waiterId, pendingTaskIds]
    );
    
    await connection.commit();
    
    return {
      success: true,
      updatedCount: result.affectedRows
    };
  } catch (error) {
    await connection.rollback();
    logger.error(`批量预审拒绝任务失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 获取H5端已提交任务列表（仅限特定会员）
 * @param {number} memberId - 会员ID（必需）
 * @param {string} taskAuditStatus - 审核状态，支持多状态条件（可选，例如 'pending|rejected'）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 任务列表和总数
 */
async function getH5List(memberId, taskAuditStatus, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    if (!memberId) {
      throw new Error('会员ID不能为空');
    }
    
    // 构建 WHERE 子句
    let whereClause = 'st.member_id = ?';
    const queryParams = [memberId];
    
    // 处理审核状态
    if (taskAuditStatus) {
      // 处理可能的多状态条件 (例如 'pending|rejected')
      if (taskAuditStatus.includes('|')) {
        const statuses = taskAuditStatus.split('|').map(s => s.trim());
        
        // 构建复杂的WHERE条件，考虑初审和正式审核两个维度
        let statusConditions = [];
        
        if (statuses.includes('approved')) {
          // 已通过：只看正式审核通过的
          statusConditions.push(`st.task_audit_status = 'approved'`);
        }
        
        if (statuses.includes('rejected')) {
          // 已拒绝：初审拒绝或正式审核拒绝
          statusConditions.push(`(st.task_pre_audit_status = 'rejected' OR st.task_audit_status = 'rejected')`);
        }
        
        if (statuses.includes('pending')) {
          // 待审核：不是初审拒绝，也不是正式审核已通过或已拒绝
          statusConditions.push(`(st.task_pre_audit_status != 'rejected' AND st.task_audit_status = 'pending')`);
        }
        
        if (statusConditions.length > 0) {
          whereClause += ` AND (${statusConditions.join(' OR ')})`;
        }
      } else {
        // 单一状态处理
        if (taskAuditStatus === 'approved') {
          // 已通过：只看正式审核通过的
          whereClause += ` AND st.task_audit_status = 'approved'`;
        } else if (taskAuditStatus === 'rejected') {
          // 已拒绝：初审拒绝或正式审核拒绝
          whereClause += ` AND (st.task_pre_audit_status = 'rejected' OR st.task_audit_status = 'rejected')`;
        } else if (taskAuditStatus === 'pending') {
          // 待审核：不是初审拒绝，也不是正式审核已通过或已拒绝
          whereClause += ` AND st.task_pre_audit_status != 'rejected' AND st.task_audit_status = 'pending'`;
        } else {
          // 处理其他可能的状态
          whereClause += ` AND st.task_audit_status = ?`;
          queryParams.push(taskAuditStatus);
        }
      }
    }
    
    // 基本查询，包含任务基本信息
    const query = `
      SELECT 
        st.*,
        t.task_name,
        t.channel_id,
        t.reward,
        t.start_time,
        t.end_time,
        c.name AS channel_name,
        c.icon AS channel_icon,
        pre_w.username AS pre_waiter_name,
        w.username AS waiter_name
      FROM 
        submitted_tasks st
        JOIN tasks t ON st.task_id = t.id
        LEFT JOIN channels c ON t.channel_id = c.id
        LEFT JOIN waiters pre_w ON st.pre_waiter_id = pre_w.id
        LEFT JOIN waiters w ON st.waiter_id = w.id
        LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
      WHERE ${whereClause} AND ttg.task_id IS NULL
      ORDER BY st.submit_time DESC
    `;
    
    // 计算总数的查询
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM submitted_tasks st
      JOIN tasks t ON st.task_id = t.id
      LEFT JOIN task_task_groups ttg ON t.id = ttg.task_id
      WHERE ${whereClause} AND ttg.task_id IS NULL
    `;
    
    // 执行查询，添加分页
    let finalQuery = query;
    finalQuery += ' LIMIT ?, ?';
    queryParams.push((page - 1) * pageSize, parseInt(pageSize, 10));
    
    const [rows] = await pool.query(finalQuery, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams);
    
    const total = countResult[0].total;
    
    // 使用 formatSubmittedTask 方法格式化结果
    const formattedList = rows.map(row => {
      // 解析JSON格式的提交内容
      if (row.submit_content) {
        try {
          // 检查是否已经是对象，避免重复解析
          if (typeof row.submit_content === 'string') {
            row.submit_content = JSON.parse(row.submit_content);
          }
        } catch (error) {
          logger.error(`解析提交内容JSON失败: ${error.message}, 原始内容类型: ${typeof row.submit_content}`);
          row.submit_content = {};
        }
      }
      
      const formattedItem = formatSubmittedTask(row);
      // 添加列表中特有的字段
      formattedItem.taskName = row.task_name;
      formattedItem.channelName = row.channel_name;
      formattedItem.channelIcon = row.channel_icon;
      formattedItem.reward = row.reward;
      formattedItem.preWaiterName = row.pre_waiter_name || '';
      formattedItem.waiterName = row.waiter_name || '';
      
      return formattedItem;
    });
    
    // 查询已提交/已完成的任务组
    let taskGroups = [];
    if (memberId) {
      let taskGroupQuery = '';
      let taskGroupParams = [memberId];
      
      if (taskAuditStatus) {
        // 处理审核状态
        if(taskAuditStatus === 'pending | rejected') {
          // 待审核或已拒绝：查询已完全提交且未完成的任务组
          taskGroupQuery = `
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
            AND etg.submit_task_ids IS NOT NULL 
            AND JSON_LENGTH(etg.submit_task_ids) > 0
            AND JSON_LENGTH(tg.related_tasks) > 0
            AND (
              SELECT COUNT(*)
              FROM JSON_TABLE(tg.related_tasks, '$[*]' COLUMNS (task_id INT PATH '$')) AS rt
              WHERE JSON_CONTAINS(etg.submit_task_ids, CAST(rt.task_id AS JSON))
            ) = JSON_LENGTH(tg.related_tasks)
            ORDER BY etg.enroll_time DESC
          `;
        } else if(taskAuditStatus === 'approved') {
          // 已通过：查询已完成的任务组
          taskGroupQuery = `
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
          AND etg.completion_status = 'completed'
          ORDER BY etg.enroll_time DESC
          `;
        }
      }
      
      // 执行任务组查询
      if (taskGroupQuery) {
        const [taskGroupRows] = await pool.query(taskGroupQuery, taskGroupParams);
        
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
    }
    
    return {
      total,
      list: formattedList,
      taskGroups: taskGroups,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取H5端已提交任务列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  create,
  getList,
  getPreAuditedList,
  getById,
  batchApprove,
  batchReject,
  batchPreApprove,
  batchPreReject,
  getByTaskAndMember,
  getH5List
}; 