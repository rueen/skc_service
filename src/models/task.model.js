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
  
  // 安全解析 JSON 字段
  try {
    formattedTask.groupIds = task.group_ids && task.group_ids.trim() ? JSON.parse(task.group_ids) : [];
  } catch (error) {
    logger.error(`解析 group_ids 失败: ${error.message}, 原始值: ${task.group_ids}`);
    formattedTask.groupIds = [];
  }
  
  formattedTask.groupMode = task.group_mode === 1;
  formattedTask.userRange = task.user_range;
  formattedTask.taskCount = task.task_count;
  
  // 安全解析 JSON 字段
  try {
    formattedTask.customFields = task.custom_fields && task.custom_fields.trim() ? JSON.parse(task.custom_fields) : [];
  } catch (error) {
    logger.error(`解析 custom_fields 失败: ${error.message}, 原始值: ${task.custom_fields}`);
    formattedTask.customFields = [];
  }
  
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
    
    // 安全处理每个任务记录
    const formattedList = [];
    for (const task of rows) {
      try {
        const formattedTask = formatTask(task);
        // 只返回列表需要的字段
        formattedList.push({
          id: formattedTask.id,
          taskName: formattedTask.taskName,
          channelId: formattedTask.channelId,
          channelName: task.channel_name,
          taskStatus: formattedTask.taskStatus,
          createTime: formattedTask.createTime
        });
      } catch (error) {
        logger.error(`格式化任务失败，任务ID: ${task.id}, 错误: ${error.message}`);
        // 跳过这条记录，继续处理其他记录
      }
    }
    
    return {
      list: formattedList,
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
    
    try {
      const task = formatTask(rows[0]);
      task.channelName = rows[0].channel_name;
      
      // 如果有群组ID，获取群组名称
      if (task.groupIds && task.groupIds.length > 0) {
        try {
          const [groups] = await pool.query(
            `SELECT id, group_name FROM \`groups\` WHERE id IN (?)`,
            [task.groupIds]
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
      
      return task;
    } catch (error) {
      logger.error(`格式化任务详情失败，任务ID: ${id}, 错误: ${error.message}`);
      
      // 返回基本信息，避免完全失败
      return {
        id: rows[0].id,
        taskName: rows[0].task_name,
        channelId: rows[0].channel_id,
        channelName: rows[0].channel_name,
        taskStatus: rows[0].task_status,
        createTime: formatDateTime(rows[0].create_time),
        error: '任务详情格式化失败，请联系管理员'
      };
    }
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
        groupIdsJson,
        taskData.groupMode ? 1 : 0,
        userRange,
        taskCount,
        customFieldsJson,
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
      updateFields.push('group_mode = ?');
      params.push(taskData.groupMode ? 1 : 0);
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