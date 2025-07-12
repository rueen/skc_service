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
  
  return convertToCamelCase({
    ...taskGroup,
    createTime: formatDateTime(taskGroup.create_time),
    updateTime: formatDateTime(taskGroup.update_time),
  });
}

/**
 * 获取任务组列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 包含列表、总数、页码、页大小的对象
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = `
      SELECT 
        tg.*,
        COUNT(ttg.task_id) as task_count
      FROM task_groups tg
      LEFT JOIN task_task_groups ttg ON tg.id = ttg.task_group_id
    `;
    
    let countQuery = 'SELECT COUNT(DISTINCT tg.id) as total FROM task_groups tg';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.taskGroupName) {
      conditions.push('tg.task_group_name LIKE ?');
      queryParams.push(`%${filters.taskGroupName}%`);
    }
    
    // 按任务名称筛选
    if (filters.taskName) {
      query += ' LEFT JOIN tasks t ON ttg.task_id = t.id';
      countQuery += ' LEFT JOIN task_task_groups ttg2 ON tg.id = ttg2.task_group_id LEFT JOIN tasks t2 ON ttg2.task_id = t2.id';
      conditions.push('t.task_name LIKE ?');
      queryParams.push(`%${filters.taskName}%`);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause.replace(/t\./g, 't2.');
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

    // 添加分组、排序和分页
    query += ' GROUP BY tg.id ORDER BY tg.create_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 格式化结果
    const formattedList = rows.map(row => {
      const formatted = formatTaskGroup(row);
      formatted.taskCount = parseInt(row.task_count || 0, 10);
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
    // 获取任务组基本信息
    const [taskGroupRows] = await pool.query(
      'SELECT * FROM task_groups WHERE id = ?',
      [id]
    );
    
    if (taskGroupRows.length === 0) {
      return null;
    }
    
    const taskGroup = formatTaskGroup(taskGroupRows[0]);
    
    // 获取关联的任务列表
    const [taskRows] = await pool.query(
      `SELECT t.*, c.name as channel_name
       FROM tasks t
       LEFT JOIN channels c ON t.channel_id = c.id
       INNER JOIN task_task_groups ttg ON t.id = ttg.task_id
       WHERE ttg.task_group_id = ?
       ORDER BY t.create_time DESC`,
      [id]
    );
    
    // 格式化任务列表
    const taskModel = require('./task.model');
    taskGroup.relatedTasks = taskRows.map(task => {
      const formattedTask = taskModel.formatTask ? taskModel.formatTask(task) : {
        id: task.id,
        taskName: task.task_name,
        channelName: task.channel_name,
        reward: parseFloat(task.reward),
        taskStatus: task.task_status,
        startTime: formatDateTime(task.start_time),
        endTime: formatDateTime(task.end_time),
        createTime: formatDateTime(task.create_time)
      };
      return formattedTask;
    });
    
    return taskGroup;
  } catch (error) {
    logger.error(`获取任务组详情失败: ${error.message}`);
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
    
    const placeholders = taskIds.map(() => '?').join(', ');
    let query = `SELECT task_id FROM task_task_groups WHERE task_id IN (${placeholders})`;
    const params = [...taskIds];
    
    if (excludeGroupId) {
      query += ' AND task_group_id != ?';
      params.push(excludeGroupId);
    }
    
    const [rows] = await pool.query(query, params);
    return rows.map(row => row.task_id);
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
    
    // 创建任务组
    const [result] = await connection.query(
      'INSERT INTO task_groups (task_group_name, task_group_reward) VALUES (?, ?)',
      [taskGroupName, taskGroupReward]
    );
    
    const taskGroupId = result.insertId;
    
    // 创建任务关联
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
    
    // 更新任务组基本信息
    await connection.query(
      'UPDATE task_groups SET task_group_name = ?, task_group_reward = ? WHERE id = ?',
      [taskGroupName, taskGroupReward, id]
    );
    
    // 删除原有的任务关联
    await connection.query(
      'DELETE FROM task_task_groups WHERE task_group_id = ?',
      [id]
    );
    
    // 创建新的任务关联
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
  create,
  update,
  remove,
  getByTaskId,
  checkTasksInOtherGroups
}; 