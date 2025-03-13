/**
 * 任务模型
 * 处理任务相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');

/**
 * 格式化任务信息
 * @param {Object} task - 任务信息
 * @returns {Object} 格式化后的任务信息
 */
function formatTask(task) {
  if (!task) return null;
  
  // 提取基本字段
  const formattedTask = { ...task };
  
  // 格式化时间字段，使用驼峰命名法
  formattedTask.startTime = formatDateTime(task.start_time);
  formattedTask.endTime = formatDateTime(task.end_time);
  formattedTask.createTime = formatDateTime(task.create_time);
  formattedTask.updateTime = formatDateTime(task.update_time);
  
  // 转换字段名称为驼峰命名法
  formattedTask.taskName = task.task_name;
  formattedTask.channelId = task.channel_id;
  formattedTask.taskType = task.task_type;
  formattedTask.groupIds = task.group_ids ? JSON.parse(task.group_ids) : [];
  formattedTask.groupMode = task.group_mode === 1;
  formattedTask.userRange = task.user_range;
  formattedTask.taskCount = task.task_count;
  formattedTask.customFields = task.custom_fields ? JSON.parse(task.custom_fields) : [];
  formattedTask.unlimitedQuota = task.unlimited_quota === 1;
  formattedTask.fansRequired = task.fans_required;
  formattedTask.contentRequirement = task.content_requirement;
  formattedTask.taskInfo = task.task_info;
  formattedTask.taskStatus = task.task_status;
  
  // 删除原始字段
  delete formattedTask.start_time;
  delete formattedTask.end_time;
  delete formattedTask.create_time;
  delete formattedTask.update_time;
  delete formattedTask.task_name;
  delete formattedTask.channel_id;
  delete formattedTask.task_type;
  delete formattedTask.group_ids;
  delete formattedTask.group_mode;
  delete formattedTask.user_range;
  delete formattedTask.task_count;
  delete formattedTask.custom_fields;
  delete formattedTask.unlimited_quota;
  delete formattedTask.fans_required;
  delete formattedTask.content_requirement;
  delete formattedTask.task_info;
  delete formattedTask.task_status;
  
  return formattedTask;
}

/**
 * 获取任务列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页条数
 * @returns {Promise<Object>} 任务列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    let query = `
      SELECT t.*, c.name as channel_name
      FROM tasks t
      LEFT JOIN channels c ON t.channel_id = c.id
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM tasks t';
    const queryParams = [];
    const conditions = [];

    // 添加筛选条件
    if (filters.taskName) {
      conditions.push('t.task_name LIKE ?');
      queryParams.push(`%${filters.taskName}%`);
    }
    
    if (filters.taskStatus) {
      conditions.push('t.task_status = ?');
      queryParams.push(filters.taskStatus);
    }
    
    if (filters.channelId) {
      conditions.push('t.channel_id = ?');
      queryParams.push(filters.channelId);
    }

    // 组合查询条件
    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    // 添加排序和分页
    query += ' ORDER BY t.create_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));

    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
    
    return {
      list: rows.map(task => {
        const formattedTask = formatTask(task);
        // 只返回列表需要的字段
        return {
          id: formattedTask.id,
          taskName: formattedTask.taskName,
          channelId: formattedTask.channelId,
          channelName: task.channel_name,
          taskStatus: formattedTask.taskStatus,
          createTime: formattedTask.createTime
        };
      }),
      total: countResult[0].total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    };
  } catch (error) {
    logger.error(`获取任务列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取任务详情
 * @param {number} id - 任务ID
 * @returns {Promise<Object|null>} 任务详情或null
 */
async function getById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.name as channel_name
       FROM tasks t
       LEFT JOIN channels c ON t.channel_id = c.id
       WHERE t.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const task = formatTask(rows[0]);
    task.channelName = rows[0].channel_name;
    
    // 如果有群组ID，获取群组名称
    if (task.groupIds && task.groupIds.length > 0) {
      const [groups] = await pool.query(
        `SELECT id, group_name FROM \`groups\` WHERE id IN (?)`,
        [task.groupIds]
      );
      
      task.groups = groups.map(group => ({
        id: group.id,
        groupName: group.group_name
      }));
    } else {
      task.groups = [];
    }
    
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
    
    // 创建任务
    const [result] = await connection.query(
      `INSERT INTO tasks 
       (task_name, channel_id, category, task_type, reward, brand, 
        group_ids, group_mode, user_range, task_count, custom_fields, 
        start_time, end_time, unlimited_quota, fans_required, 
        content_requirement, task_info, notice, task_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskData.taskName,
        taskData.channelId,
        taskData.category,
        taskData.taskType,
        taskData.reward,
        taskData.brand,
        JSON.stringify(taskData.groupIds || []),
        taskData.groupMode ? 1 : 0,
        taskData.userRange || 1,
        taskData.taskCount || 0,
        JSON.stringify(taskData.customFields || []),
        taskData.startTime,
        taskData.endTime,
        taskData.unlimitedQuota ? 1 : 0,
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
      'SELECT id FROM tasks WHERE id = ?',
      [taskData.id]
    );
    
    if (existingTask.length === 0) {
      throw new Error('任务不存在');
    }
    
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
      updateFields.push('group_ids = ?');
      params.push(JSON.stringify(taskData.groupIds || []));
    }
    
    if (taskData.groupMode !== undefined) {
      updateFields.push('group_mode = ?');
      params.push(taskData.groupMode ? 1 : 0);
    }
    
    if (taskData.userRange !== undefined) {
      updateFields.push('user_range = ?');
      params.push(taskData.userRange);
    }
    
    if (taskData.taskCount !== undefined) {
      updateFields.push('task_count = ?');
      params.push(taskData.taskCount);
    }
    
    if (taskData.customFields !== undefined) {
      updateFields.push('custom_fields = ?');
      params.push(JSON.stringify(taskData.customFields || []));
    }
    
    if (taskData.startTime !== undefined) {
      updateFields.push('start_time = ?');
      params.push(taskData.startTime);
    }
    
    if (taskData.endTime !== undefined) {
      updateFields.push('end_time = ?');
      params.push(taskData.endTime);
    }
    
    if (taskData.unlimitedQuota !== undefined) {
      updateFields.push('unlimited_quota = ?');
      params.push(taskData.unlimitedQuota ? 1 : 0);
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
      'SELECT COUNT(*) as count FROM task_submitted WHERE task_id = ?',
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
  getById,
  create,
  update,
  remove
}; 