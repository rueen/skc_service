/**
 * 任务组模型
 * 处理任务组相关的数据库操作
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');
const { formatDateTime } = require('../utils/date.util');
const { convertToCamelCase } = require('../utils/data.util');

/**
 * 格式化任务组信息
 * @param {Object} taskGroup - 任务组信息
 * @returns {Object} 格式化后的任务组信息
 */
function formatTaskGroup(taskGroup) {
  if (!taskGroup) return null;
  
  const formattedTaskGroup = convertToCamelCase({
    ...taskGroup,
    createTime: formatDateTime(taskGroup.create_time),
    updateTime: formatDateTime(taskGroup.update_time),
  });
  
  // 安全解析 related_tasks JSON 字段
  try {
    if (Array.isArray(taskGroup.related_tasks)) {
      formattedTaskGroup.relatedTasks = taskGroup.related_tasks;
    } else if (typeof taskGroup.related_tasks === 'string' && taskGroup.related_tasks.trim()) {
      formattedTaskGroup.relatedTasks = JSON.parse(taskGroup.related_tasks);
    } else {
      formattedTaskGroup.relatedTasks = [];
    }
  } catch (error) {
    logger.error(`解析 related_tasks 失败: ${error.message}, 原始值: ${taskGroup.related_tasks}`);
    formattedTaskGroup.relatedTasks = [];
  }
  
  // 添加奖励相关字段
  if (taskGroup.related_tasks_reward_sum !== undefined) {
    const taskGroupReward = parseFloat(taskGroup.task_group_reward) || 0;
    const relatedTasksRewardSum = parseFloat(taskGroup.related_tasks_reward_sum) || 0;
    
    formattedTaskGroup.relatedTasksRewardSum = relatedTasksRewardSum;
    formattedTaskGroup.allReward = taskGroupReward + relatedTasksRewardSum;
  }
  
  return formattedTaskGroup;
}

/**
 * 获取任务组列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @param {Object} sortOptions - 排序选项
 * @param {string} sortOptions.field - 排序字段 (createTime, updateTime)
 * @param {string} sortOptions.order - 排序方式 (ascend, descend)
 * @returns {Promise<Object>} 包含列表、总数、页码、页大小的对象
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, sortOptions = {}) {
  try {
    let query = `
      SELECT tg.*,
        (SELECT COUNT(*) FROM enrolled_task_groups etg WHERE etg.task_group_id = tg.id) as enrolled_count,
        (SELECT COUNT(*) FROM enrolled_task_groups etg WHERE etg.task_group_id = tg.id AND etg.completion_status = 'completed') as completed_count,
        (SELECT COALESCE(SUM(rt.reward), 0) 
         FROM tasks rt 
         WHERE JSON_CONTAINS(tg.related_tasks, CAST(rt.id AS JSON))
        ) as related_tasks_reward_sum
      FROM task_groups tg
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM task_groups tg';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.taskGroupName) {
      conditions.push('tg.task_group_name LIKE ?');
      queryParams.push(`%${filters.taskGroupName}%`);
    }
    
    // 按任务名称筛选 - 需要在 JSON 字段中搜索
    if (filters.taskName) {
      query += ' LEFT JOIN tasks t ON JSON_CONTAINS(tg.related_tasks, CAST(t.id AS JSON))';
      countQuery += ' LEFT JOIN tasks t ON JSON_CONTAINS(tg.related_tasks, CAST(t.id AS JSON))';
      conditions.push('t.task_name LIKE ?');
      queryParams.push(`%${filters.taskName}%`);
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

    // 处理排序
    if (sortOptions.field && sortOptions.order) {
      // 字段映射
      const fieldMap = {
        createTime: 'tg.create_time',
        updateTime: 'tg.update_time'
      };
      
      const dbField = fieldMap[sortOptions.field];
      const dbOrder = sortOptions.order === 'ascend' ? 'ASC' : 'DESC';
      
      if (dbField) {
        query += ` ORDER BY ${dbField} ${dbOrder}`;
      } else {
        query += ' ORDER BY tg.create_time DESC';
      }
    } else {
      query += ' ORDER BY tg.create_time DESC';
    }
    
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 格式化结果
    const formattedList = rows.map((row) => {
      const formatted = formatTaskGroup(row);
      // 计算任务数量
      formatted.taskCount = formatted.relatedTasks ? formatted.relatedTasks.length : 0;
      // 添加报名统计
      formatted.enrolledCount = parseInt(row.enrolled_count) || 0;
      formatted.completedCount = parseInt(row.completed_count) || 0;
      return formatted;
    });
    
    return {
      list: formattedList,
      total: total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取任务组列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取任务组详情
 * @param {number} id - 任务组ID
 * @returns {Promise<Object>} 任务组详情
 */
async function getDetail(id) {
  try {
    // 获取任务组基本信息，包含关联任务奖励总和
    const [taskGroupRows] = await pool.query(
      `SELECT tg.*,
        (SELECT COALESCE(SUM(rt.reward), 0) 
         FROM tasks rt 
         WHERE JSON_CONTAINS(tg.related_tasks, CAST(rt.id AS JSON))
        ) as related_tasks_reward_sum
       FROM task_groups tg
       WHERE tg.id = ?`,
      [id]
    );
    
    if (taskGroupRows.length === 0) {
      return null;
    }
    
    // 格式化任务组信息（formatTaskGroup 会处理 related_tasks 字段）
    const taskGroup = formatTaskGroup(taskGroupRows[0]);
    
    return taskGroup;
  } catch (error) {
    logger.error(`获取任务组详情失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取任务组已关联任务列表
 * @param {number} id - 任务组ID
 * @param {number} memberId - 用户ID
 * @returns {Promise<Array>} 关联任务列表
 */
async function getRelatedTasks(id, memberId) {
  try {
    // 先获取任务组信息
    const [taskGroupRows] = await pool.query(
      'SELECT related_tasks FROM task_groups WHERE id = ?',
      [id]
    );
    
    if (taskGroupRows.length === 0) {
      return null;
    }
    
    // 解析 related_tasks 字段
    let relatedTaskIds = [];
    try {
      if (Array.isArray(taskGroupRows[0].related_tasks)) {
        relatedTaskIds = taskGroupRows[0].related_tasks;
      } else if (typeof taskGroupRows[0].related_tasks === 'string' && taskGroupRows[0].related_tasks.trim()) {
        relatedTaskIds = JSON.parse(taskGroupRows[0].related_tasks);
      }
    } catch (error) {
      logger.error(`解析任务组 ${id} 的 related_tasks 失败: ${error.message}`);
    }
    
    // 如果没有关联任务，返回空数组
    if (relatedTaskIds.length === 0) {
      return [];
    }
    
    // 查询关联任务的详细信息
    const placeholders = relatedTaskIds.map(() => '?').join(', ');
    const query = `
      SELECT 
        t.id AS task_id,
        t.task_name,
        t.reward,
        t.task_type,
        t.fans_required,
        t.unlimited_quota,
        t.quota,
        t.category,
        t.start_time,
        t.end_time,
        c.icon AS channel_icon,
        et.id AS enroll_id,
        et.enroll_time,
        st.task_pre_audit_status,
        st.task_audit_status,
        st.submit_time,
        (SELECT COUNT(*) FROM submitted_tasks st2 WHERE st2.task_id = t.id AND st2.task_audit_status != 'rejected' AND st2.task_pre_audit_status != 'rejected') AS submitted_count
      FROM tasks t
      LEFT JOIN channels c ON t.channel_id = c.id
      LEFT JOIN enrolled_tasks et ON t.id = et.task_id AND et.member_id = ?
      LEFT JOIN submitted_tasks st ON t.id = st.task_id AND st.member_id = ?
      WHERE t.id IN (${placeholders})
      ORDER BY FIELD(t.id, ${placeholders})
    `;
    
    const queryParams = [memberId, memberId, ...relatedTaskIds, ...relatedTaskIds];
    const [taskRows] = await pool.query(query, queryParams);
    
    // 格式化结果
    const formattedTasks = taskRows.map(row => {
      // 计算剩余配额
      let remainingQuota = null;
      if (row.unlimited_quota === 1) {
        remainingQuota = null; // 无限配额
      } else {
        remainingQuota = Math.max(0, row.quota - row.submitted_count);
      }
      
      return {
        taskId: row.task_id,
        channelIcon: row.channel_icon,
        taskName: row.task_name,
        isEnrolled: !!row.enroll_id,
        isSubmited: !!row.submit_time,
        reward: row.reward,
        taskType: row.task_type,
        fansRequired: row.fans_required,
        unlimitedQuota: row.unlimited_quota === 1,
        remainingQuota: remainingQuota,
        category: row.category,
        startTime: formatDateTime(row.start_time),
        endTime: formatDateTime(row.end_time),
        enrollId: row.enroll_id || null,
        taskPreAuditStatus: row.task_pre_audit_status || null,
        taskAuditStatus: row.task_audit_status || null,
        submitTime: row.submit_time ? formatDateTime(row.submit_time) : null
      };
    });
    
    return formattedTasks;
  } catch (error) {
    logger.error(`获取任务组关联任务列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查任务是否已属于其他任务组
 * @param {Array} taskIds - 任务ID数组
 * @param {number} excludeGroupId - 排除的任务组ID（用于更新时）
 * @returns {Promise<Array>} 已被占用的任务ID数组
 */
async function checkTasksInOtherGroups(taskIds, excludeGroupId = null) {
  try {
    if (!taskIds || taskIds.length === 0) {
      return [];
    }
    
    let query = 'SELECT id, related_tasks FROM task_groups WHERE related_tasks IS NOT NULL';
    const params = [];
    
    if (excludeGroupId) {
      query += ' AND id != ?';
      params.push(excludeGroupId);
    }
    
    const [rows] = await pool.query(query, params);
    
    const occupiedTasks = [];
    
    for (const row of rows) {
      try {
        let relatedTasks = [];
        if (Array.isArray(row.related_tasks)) {
          relatedTasks = row.related_tasks;
        } else if (typeof row.related_tasks === 'string' && row.related_tasks.trim()) {
          relatedTasks = JSON.parse(row.related_tasks);
        }
        
        // 检查是否有重叠的任务ID
        const overlaps = taskIds.filter(taskId => relatedTasks.includes(taskId));
        occupiedTasks.push(...overlaps);
      } catch (error) {
        logger.error(`解析任务组 ${row.id} 的 related_tasks 失败: ${error.message}`);
      }
    }
    
    // 去重并返回
    return [...new Set(occupiedTasks)];
  } catch (error) {
    logger.error(`检查任务占用状态失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建任务组
 * @param {Object} taskGroupData - 任务组数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(taskGroupData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { taskGroupName, taskGroupReward, relatedTasks = [] } = taskGroupData;
    
    // 检查任务组名称是否已存在
    const [existingGroups] = await connection.query(
      'SELECT id FROM task_groups WHERE task_group_name = ?',
      [taskGroupName]
    );
    
    if (existingGroups.length > 0) {
      throw new Error('任务组名称已存在');
    }
    
    // 检查任务是否已属于其他任务组
    if (relatedTasks.length > 0) {
      const occupiedTasks = await checkTasksInOtherGroups(relatedTasks);
      if (occupiedTasks.length > 0) {
        throw new Error(`任务 ${occupiedTasks.join(', ')} 已属于其他任务组`);
      }
      
      // 验证任务是否存在
      const placeholders = relatedTasks.map(() => '?').join(', ');
      const [taskRows] = await connection.query(
        `SELECT id FROM tasks WHERE id IN (${placeholders})`,
        relatedTasks
      );
      
      if (taskRows.length !== relatedTasks.length) {
        const existingTaskIds = taskRows.map(row => row.id);
        const nonExistentTasks = relatedTasks.filter(id => !existingTaskIds.includes(id));
        throw new Error(`任务 ${nonExistentTasks.join(', ')} 不存在`);
      }
    }
    
    // 序列化关联任务为 JSON
    const relatedTasksJson = JSON.stringify(relatedTasks);
    
    // 创建任务组（包含 related_tasks 字段）
    const [result] = await connection.query(
      'INSERT INTO task_groups (task_group_name, task_group_reward, related_tasks) VALUES (?, ?, ?)',
      [taskGroupName, taskGroupReward, relatedTasksJson]
    );
    
    const taskGroupId = result.insertId;
    
    // 同时在关联表中创建记录（保持兼容性）
    if (relatedTasks.length > 0) {
      const associations = relatedTasks.map(taskId => [taskId, taskGroupId]);
      await connection.query(
        'INSERT INTO task_task_groups (task_id, task_group_id) VALUES ?',
        [associations]
      );
    }
    
    await connection.commit();
    logger.info(`任务组创建成功 - ID: ${taskGroupId}, 名称: ${taskGroupName}, 关联任务数: ${relatedTasks.length}`);
    
    return { id: taskGroupId };
  } catch (error) {
    await connection.rollback();
    logger.error(`创建任务组失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 更新任务组
 * @param {number} id - 任务组ID
 * @param {Object} taskGroupData - 任务组数据
 * @returns {Promise<boolean>} 更新结果
 */
async function update(id, taskGroupData) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { taskGroupName, taskGroupReward, relatedTasks = [] } = taskGroupData;
    
    // 检查任务组是否存在
    const [existingGroups] = await connection.query(
      'SELECT id FROM task_groups WHERE id = ?',
      [id]
    );
    
    if (existingGroups.length === 0) {
      throw new Error('任务组不存在');
    }
    
    // 检查名称是否与其他任务组冲突
    const [nameConflictGroups] = await connection.query(
      'SELECT id FROM task_groups WHERE task_group_name = ? AND id != ?',
      [taskGroupName, id]
    );
    
    if (nameConflictGroups.length > 0) {
      throw new Error('任务组名称已存在');
    }
    
    // 检查任务是否已属于其他任务组
    if (relatedTasks.length > 0) {
      const occupiedTasks = await checkTasksInOtherGroups(relatedTasks, id);
      if (occupiedTasks.length > 0) {
        throw new Error(`任务 ${occupiedTasks.join(', ')} 已属于其他任务组`);
      }
      
      // 验证任务是否存在
      const placeholders = relatedTasks.map(() => '?').join(', ');
      const [taskRows] = await connection.query(
        `SELECT id FROM tasks WHERE id IN (${placeholders})`,
        relatedTasks
      );
      
      if (taskRows.length !== relatedTasks.length) {
        const existingTaskIds = taskRows.map(row => row.id);
        const nonExistentTasks = relatedTasks.filter(taskId => !existingTaskIds.includes(taskId));
        throw new Error(`任务 ${nonExistentTasks.join(', ')} 不存在`);
      }
    }
    
    // 序列化关联任务为 JSON
    const relatedTasksJson = JSON.stringify(relatedTasks);
    
    // 更新任务组基本信息（包含 related_tasks 字段）
    await connection.query(
      'UPDATE task_groups SET task_group_name = ?, task_group_reward = ?, related_tasks = ? WHERE id = ?',
      [taskGroupName, taskGroupReward, relatedTasksJson, id]
    );
    
    // 删除原有的任务关联
    await connection.query(
      'DELETE FROM task_task_groups WHERE task_group_id = ?',
      [id]
    );
    
    // 创建新的任务关联（保持兼容性）
    if (relatedTasks.length > 0) {
      const associations = relatedTasks.map(taskId => [taskId, id]);
      await connection.query(
        'INSERT INTO task_task_groups (task_id, task_group_id) VALUES ?',
        [associations]
      );
    }
    
    await connection.commit();
    logger.info(`任务组更新成功 - ID: ${id}, 名称: ${taskGroupName}, 关联任务数: ${relatedTasks.length}`);
    
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新任务组失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除任务组
 * @param {number} id - 任务组ID
 * @returns {Promise<boolean>} 删除结果
 */
async function remove(id) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查任务组是否存在
    const [existingGroups] = await connection.query(
      'SELECT task_group_name FROM task_groups WHERE id = ?',
      [id]
    );
    
    if (existingGroups.length === 0) {
      throw new Error('任务组不存在');
    }
    
    const taskGroupName = existingGroups[0].task_group_name;
    
    // 删除任务关联
    await connection.query(
      'DELETE FROM task_task_groups WHERE task_group_id = ?',
      [id]
    );
    
    // 删除任务组
    await connection.query(
      'DELETE FROM task_groups WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    logger.info(`任务组删除成功 - ID: ${id}, 名称: ${taskGroupName}`);
    
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`删除任务组失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 根据任务ID获取所属任务组
 * @param {number} taskId - 任务ID
 * @returns {Promise<Object|null>} 任务组信息
 */
async function getByTaskId(taskId) {
  try {
    const [rows] = await pool.query(
      `SELECT tg.* 
       FROM task_groups tg
       INNER JOIN task_task_groups ttg ON tg.id = ttg.task_group_id
       WHERE ttg.task_id = ?`,
      [taskId]
    );
    
    return rows.length > 0 ? formatTaskGroup(rows[0]) : null;
  } catch (error) {
    logger.error(`根据任务ID获取任务组失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  formatTaskGroup,
  getList,
  getDetail,
  getRelatedTasks,
  create,
  update,
  remove,
  getByTaskId,
  checkTasksInOtherGroups
}; 