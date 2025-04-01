/**
 * 已提交任务模型
 * 处理任务提交相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');
const rewardModel = require('./reward.model');
const groupModel = require('./group.model');
const { convertToCamelCase } = require('../utils/data.util');
const memberModel = require('./member.model');

function formatSubmittedTask(submittedTask) {
  if (!submittedTask) return null;
  
  // 转换字段名称为驼峰命名法
  const formattedSubmittedTask = convertToCamelCase({
    ...submittedTask,
    submitTime: formatDateTime(submittedTask.submit_time),
    createTime: formatDateTime(submittedTask.create_time),
    updateTime: formatDateTime(submittedTask.update_time)
  });
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
      // 获取当前有效提交数量
      const [submitCount] = await connection.query(
        'SELECT COUNT(*) as count FROM submitted_tasks WHERE task_id = ? AND task_audit_status != "rejected"',
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
      'SELECT id, task_audit_status FROM submitted_tasks WHERE task_id = ? AND member_id = ?',
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
    
    // 如果已提交且状态为 pending 或 approved，则不允许再次提交
    if (existingSubmits.length > 0) {
      const status = existingSubmits[0].task_audit_status;
      if (status === 'pending') {
        throw new Error('任务已提交，正在审核中');
      } else if (status === 'approved') {
        throw new Error('任务已提交并已通过审核');
      } else {
        // 如果是rejected状态，则更新现有记录，同时更新群组ID
        await connection.query(
          `UPDATE submitted_tasks 
           SET submit_content = ?, submit_time = NOW(), task_audit_status = 'pending', reject_reason = NULL, related_group_id = ? 
           WHERE id = ?`,
          [JSON.stringify(submitData.submitContent), relatedGroupId, existingSubmits[0].id]
        );
        
        await connection.commit();
        return { id: existingSubmits[0].id, isResubmit: true, relatedGroupId };
      }
    }
    
    // 插入提交记录，包含关联的群组ID
    const [result] = await connection.query(
      `INSERT INTO submitted_tasks 
       (task_id, member_id, submit_content, task_audit_status, related_group_id) 
       VALUES (?, ?, ?, 'pending', ?)`,
      [submitData.taskId, submitData.memberId, JSON.stringify(submitData.submitContent), relatedGroupId]
    );
    
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
 * @param {string} filters.taskAuditStatus - 审核状态
 * @param {number} filters.groupId - 群组ID
 * @param {string} filters.submitStartTime - 提交开始时间
 * @param {string} filters.submitEndTime - 提交结束时间
 * @param {number} filters.completedTaskCount - 会员已完成任务数量
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 任务列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = `
      SELECT DISTINCT 
        st.*,
        t.task_name,
        t.reward,
        t.channel_id,
        c.name as channel_name,
        c.icon as channel_icon,
        m.nickname,
        mg.group_id,
        g_table.group_name,
        g_table.owner_id = m.id as is_group_owner
    `;
    
    // 如果筛选条件中包含已完成任务数量，添加子查询计算每个会员的已完成任务数
    if (filters.completedTaskCount !== undefined) {
      query += `,
        (SELECT COUNT(*) FROM submitted_tasks WHERE member_id = st.member_id AND task_audit_status = 'approved') as completed_task_count
      `;
    }
    
    query += `
      FROM submitted_tasks st
      LEFT JOIN tasks t ON st.task_id = t.id
      LEFT JOIN channels c ON t.channel_id = c.id
      LEFT JOIN members m ON st.member_id = m.id
    `;

    // 根据是否有groupId过滤条件，采用不同的JOIN策略
    if (filters.groupId) {
      // 如果指定了群组ID，则只关联指定群组
      query += `
        LEFT JOIN member_groups mg ON st.member_id = mg.member_id AND mg.group_id = ${parseInt(filters.groupId, 10)}
        LEFT JOIN \`groups\` g_table ON mg.group_id = g_table.id
      `;
    } else {
      // 如果没有指定群组ID，则关联会员的主要群组（或第一个群组）
      query += `
        LEFT JOIN (
          SELECT member_id, group_id, is_owner
          FROM member_groups
          WHERE (member_id, id) IN (
            SELECT member_id, MIN(id)
            FROM member_groups
            GROUP BY member_id
          )
        ) mg ON st.member_id = mg.member_id
        LEFT JOIN \`groups\` g_table ON mg.group_id = g_table.id
      `;
    }
    
    query += " WHERE 1=1";
    
    // 计算总数的查询
    let countQuery = `
      SELECT COUNT(DISTINCT st.id) as total 
      FROM submitted_tasks st
      LEFT JOIN tasks t ON st.task_id = t.id
      LEFT JOIN channels c ON t.channel_id = c.id
      LEFT JOIN members m ON st.member_id = m.id
    `;
    
    // 对于计数查询也需要相同的JOIN逻辑
    if (filters.groupId) {
      countQuery += `
        LEFT JOIN member_groups mg ON st.member_id = mg.member_id AND mg.group_id = ${parseInt(filters.groupId, 10)}
        LEFT JOIN \`groups\` g_table ON mg.group_id = g_table.id
      `;
    } else {
      countQuery += `
        LEFT JOIN (
          SELECT member_id, group_id, is_owner
          FROM member_groups
          WHERE (member_id, id) IN (
            SELECT member_id, MIN(id)
            FROM member_groups
            GROUP BY member_id
          )
        ) mg ON st.member_id = mg.member_id
        LEFT JOIN \`groups\` g_table ON mg.group_id = g_table.id
      `;
    }
    
    countQuery += " WHERE 1=1";
    
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
      query += ' AND st.task_audit_status = ?';
      countQuery += ' AND st.task_audit_status = ?';
      queryParams.push(filters.taskAuditStatus);
    }
    
    if (filters.groupId) {
      query += ' AND mg.group_id = ?';
      countQuery += ' AND mg.group_id = ?';
      queryParams.push(filters.groupId);
    }
    
    // 添加提交时间范围筛选
    if (filters.submitStartTime) {
      query += ' AND st.submit_time >= ?';
      countQuery += ' AND st.submit_time >= ?';
      queryParams.push(filters.submitStartTime);
    }
    
    if (filters.submitEndTime) {
      query += ' AND st.submit_time <= ?';
      countQuery += ' AND st.submit_time <= ?';
      queryParams.push(filters.submitEndTime);
    }
    
    // 添加会员已完成任务数量筛选
    if (filters.completedTaskCount !== undefined) {
      query += ' HAVING completed_task_count = ?';
      // 在计数查询中，需要使用子查询来筛选
      countQuery += ` AND st.member_id IN (
                        SELECT member_id 
                        FROM submitted_tasks 
                        WHERE task_audit_status = 'approved' 
                        GROUP BY member_id 
                        HAVING COUNT(*) = ?
                      )`;
      queryParams.push(filters.completedTaskCount);
    }
    
    // 添加排序和分页
    query += ' ORDER BY st.submit_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));
    
    // 为计数查询添加相同参数（除了分页参数）
    const countQueryParams = [...queryParams];
    if (filters.completedTaskCount !== undefined) {
      // 计数查询中的参数需要去除最后两个分页参数
      countQueryParams.splice(-2, 2);
    } else {
      // 如果没有completedTaskCount参数，正常去除分页参数
      countQueryParams.splice(-2, 2);
    }
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    const [countResult] = await pool.query(countQuery, countQueryParams);
    
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
      formattedItem.channelName = row.channel_name;
      formattedItem.channelIcon = row.channel_icon;
      formattedItem.memberNickname = row.nickname;
      formattedItem.groupId = row.group_id;
      formattedItem.groupName = row.group_name;
      formattedItem.isGroupOwner = !!row.is_group_owner;
      
      // 如果查询了已完成任务数量，则添加该字段到结果中
      if (filters.completedTaskCount !== undefined) {
        formattedItem.completedTaskCount = row.completed_task_count;
      }
      
      return formattedItem;
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
        st.*,
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
    
    // 获取所有待审核任务的ID列表，按提交时间降序排列（与待审核任务列表页展示一致）
    const [pendingTasks] = await pool.query(
      `SELECT id, submit_time FROM submitted_tasks 
       WHERE task_audit_status = 'pending' 
       ORDER BY submit_time DESC`
    );
    
    // 初始化前后任务ID为null
    formattedTask.prevTaskId = null;
    formattedTask.nextTaskId = null;
    
    if (pendingTasks.length > 0) {
      // 将所有待审核任务ID转为数组
      const pendingTaskIds = pendingTasks.map(task => task.id);
      
      if (row.task_audit_status === 'pending') {
        // 如果当前任务是待审核状态，找出它在列表中的位置
        const currentIndex = pendingTaskIds.findIndex(taskId => taskId === Number(id));
        
        if (currentIndex !== -1) {
          // 前一个任务是列表中的前一个索引（较新的任务）
          if (currentIndex > 0) {
            formattedTask.prevTaskId = pendingTaskIds[currentIndex - 1];
          }
          
          // 后一个任务是列表中的后一个索引（较旧的任务）
          if (currentIndex + 1 < pendingTaskIds.length) {
            formattedTask.nextTaskId = pendingTaskIds[currentIndex + 1];
          }
        }
      } else {
        // 如果当前任务不是待审核状态，查找Submit Time最接近当前任务的待审核任务
        const currentSubmitTime = new Date(row.submit_time).getTime();
        
        // 查找提交时间比当前任务更新的第一个待审核任务（前一个任务）
        const newerTask = pendingTasks.find(task => 
          new Date(task.submit_time).getTime() > currentSubmitTime
        );
        
        // 查找提交时间比当前任务更旧的第一个待审核任务（后一个任务）
        const olderTask = pendingTasks.find(task => 
          new Date(task.submit_time).getTime() < currentSubmitTime
        );
        
        // 设置前一个和后一个任务ID
        if (newerTask) {
          formattedTask.prevTaskId = newerTask.id;
        } else if (pendingTasks.length > 0) {
          // 如果没有更新的任务，返回最新的待审核任务
          formattedTask.prevTaskId = pendingTaskIds[0];
        }
        
        if (olderTask) {
          formattedTask.nextTaskId = olderTask.id;
        }
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
    
    // 更新任务状态为已通过
    const [result] = await connection.query(
      `UPDATE submitted_tasks 
       SET task_audit_status = 'approved', waiter_id = ? 
       WHERE id IN (?) AND task_audit_status = 'pending'`,
      [waiterId, ids]
    );
    
    // 获取已通过任务的关联信息
    // 注意：这里在同一个事务中，所以可以看到刚刚更新的状态
    const [approvedTasks] = await connection.query(
      `SELECT 
        st.id, st.task_id, st.member_id, st.related_group_id, t.reward
      FROM submitted_tasks st
      JOIN tasks t ON st.task_id = t.id
      WHERE st.id IN (?) AND st.task_audit_status = 'approved'`,
      [ids]
    );
    
    // 处理任务奖励
    const rewardResults = [];
    for (const task of approvedTasks) {
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
      `SELECT * FROM submitted_tasks WHERE task_id = ? AND member_id = ?`,
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
    return formatSubmittedTask(row);
  } catch (error) {
    logger.error(`根据会员ID和任务ID获取任务提交失败: ${error.message}`);
    throw error;
  }
}

/**
 * 导出已提交任务列表
 * @param {Object} filters - 筛选条件
 * @param {string} filters.taskName - 任务名称
 * @param {number} filters.channelId - 渠道ID
 * @param {string} filters.taskAuditStatus - 审核状态
 * @param {number} filters.groupId - 群组ID
 * @param {string} filters.submitStartTime - 提交开始时间
 * @param {string} filters.submitEndTime - 提交结束时间
 * @param {number} filters.completedTaskCount - 会员已完成任务数量
 * @returns {Promise<Array>} 任务列表
 */
async function exportSubmittedTasks(filters = {}) {
  try {
    let query = `
      SELECT 
        st.id,
        st.task_id,
        st.member_id,
        st.submit_time,
        st.task_audit_status,
        st.reject_reason,
        st.related_group_id,
        st.waiter_id,
        st.create_time,
        st.update_time,
        t.task_name,
        t.reward,
        t.channel_id,
        c.name as channel_name,
        m.nickname as member_nickname,
        g.group_name
    `;

    // 如果筛选条件中包含已完成任务数量，添加子查询计算每个会员的已完成任务数
    if (filters.completedTaskCount !== undefined) {
      query += `,
        (SELECT COUNT(*) FROM submitted_tasks WHERE member_id = st.member_id AND task_audit_status = 'approved') as completed_task_count
      `;
    }
    
    query += `
      FROM submitted_tasks st
      LEFT JOIN tasks t ON st.task_id = t.id
      LEFT JOIN channels c ON t.channel_id = c.id
      LEFT JOIN members m ON st.member_id = m.id
      LEFT JOIN \`groups\` g ON st.related_group_id = g.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // 添加筛选条件
    if (filters.taskName) {
      query += ' AND t.task_name LIKE ?';
      queryParams.push(`%${filters.taskName}%`);
    }
    
    if (filters.channelId) {
      query += ' AND t.channel_id = ?';
      queryParams.push(filters.channelId);
    }
    
    if (filters.taskAuditStatus) {
      query += ' AND st.task_audit_status = ?';
      queryParams.push(filters.taskAuditStatus);
    }
    
    if (filters.groupId) {
      query += ' AND st.related_group_id = ?';
      queryParams.push(filters.groupId);
    }
    
    // 添加提交时间范围筛选
    if (filters.submitStartTime) {
      query += ' AND st.submit_time >= ?';
      queryParams.push(filters.submitStartTime);
    }
    
    if (filters.submitEndTime) {
      query += ' AND st.submit_time <= ?';
      queryParams.push(filters.submitEndTime);
    }
    
    // 添加会员已完成任务数量筛选
    if (filters.completedTaskCount !== undefined) {
      query += ' HAVING completed_task_count = ?';
      queryParams.push(filters.completedTaskCount);
    }
    
    // 添加排序
    query += ' ORDER BY st.submit_time DESC';
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 格式化结果
    const formattedList = rows.map(row => {
      const formattedItem = formatSubmittedTask(row);
      // 添加列表中特有的字段
      formattedItem.channelName = row.channel_name;
      formattedItem.memberNickname = row.member_nickname;
      formattedItem.groupName = row.group_name;
      
      // 如果查询了已完成任务数量，则添加该字段到结果中
      if (filters.completedTaskCount !== undefined) {
        formattedItem.completedTaskCount = row.completed_task_count;
      }
      
      return formattedItem;
    });
    
    return formattedList;
  } catch (error) {
    logger.error(`导出已提交任务列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  create,
  getList,
  getById,
  batchApprove,
  batchReject,
  getByTaskAndMember,
  exportSubmittedTasks
}; 