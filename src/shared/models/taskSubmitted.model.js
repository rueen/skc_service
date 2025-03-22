/**
 * 任务提交模型
 * 处理任务提交相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../config/api.config');

/**
 * 格式化任务提交信息
 * @param {Object} submission - 任务提交信息
 * @returns {Object} 格式化后的任务提交信息
 */
function formatSubmission(submission) {
  if (!submission) return null;
  
  // 提取基本字段
  const formattedSubmission = { ...submission };
  
  // 格式化时间字段，使用驼峰命名法
  formattedSubmission.submitTime = formatDateTime(submission.submit_time);
  formattedSubmission.createTime = formatDateTime(submission.create_time);
  formattedSubmission.updateTime = formatDateTime(submission.update_time);
  
  // 转换字段名称为驼峰命名法
  formattedSubmission.taskId = submission.task_id;
  formattedSubmission.memberId = submission.member_id;
  formattedSubmission.memberName = submission.member_name;
  formattedSubmission.taskName = submission.task_name;
  formattedSubmission.submitContent = submission.submit_content;
  
  // 安全解析 JSON 字段
  try {
    if (typeof submission.submit_content === 'string' && submission.submit_content.trim()) {
      formattedSubmission.content = JSON.parse(submission.submit_content);
    } else if (typeof submission.submit_content === 'object') {
      formattedSubmission.content = submission.submit_content;
    } else {
      formattedSubmission.content = {};
    }
  } catch (error) {
    logger.error(`解析 submit_content 失败: ${error.message}, 原始值: ${submission.submit_content}`);
    formattedSubmission.content = {};
  }
  
  return formattedSubmission;
}

/**
 * 获取任务提交列表
 * @param {Object} filters - 筛选条件
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 任务提交列表和总数
 */
async function getList(filters = {}, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) {
  try {
    const offset = (page - 1) * pageSize;
    
    // 构建查询条件
    let whereClause = '1=1';
    const queryParams = [];
    
    if (filters.taskId) {
      whereClause += ' AND ts.task_id = ?';
      queryParams.push(filters.taskId);
    }
    
    if (filters.memberId) {
      whereClause += ' AND ts.member_id = ?';
      queryParams.push(filters.memberId);
    }
    
    // 构建查询语句 - 移除waiters表的关联
    const query = `
      SELECT ts.*, t.task_name, m.member_nickname as member_name
      FROM task_submitted ts
      LEFT JOIN tasks t ON ts.task_id = t.id
      LEFT JOIN members m ON ts.member_id = m.id
      WHERE ${whereClause}
      ORDER BY ts.create_time DESC
      LIMIT ? OFFSET ?
    `;
    
    // 添加分页参数
    queryParams.push(parseInt(pageSize, 10), offset);
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM task_submitted ts
      WHERE ${whereClause}
    `;
    
    const [countRows] = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = countRows[0].total;
    
    // 格式化结果
    const formattedRows = rows.map(formatSubmission);
    
    return {
      list: formattedRows,
      pagination: {
        total,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10)
      }
    };
  } catch (error) {
    logger.error(`获取任务提交列表失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取任务提交信息
 * @param {number} id - 任务提交ID
 * @returns {Promise<Object>} 任务提交信息
 */
async function getById(id) {
  try {
    const query = `
      SELECT ts.*, t.task_name, m.member_nickname as member_name
      FROM task_submitted ts
      LEFT JOIN tasks t ON ts.task_id = t.id
      LEFT JOIN members m ON ts.member_id = m.id
      WHERE ts.id = ?
    `;
    
    const [rows] = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatSubmission(rows[0]);
  } catch (error) {
    logger.error(`根据ID获取任务提交信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据任务ID和会员ID获取任务提交信息
 * @param {number} taskId - 任务ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 任务提交信息
 */
async function getByTaskAndMember(taskId, memberId) {
  try {
    const query = `
      SELECT ts.*, t.task_name, m.member_nickname as member_name
      FROM task_submitted ts
      LEFT JOIN tasks t ON ts.task_id = t.id
      LEFT JOIN members m ON ts.member_id = m.id
      WHERE ts.task_id = ? AND ts.member_id = ?
    `;
    
    const [rows] = await pool.query(query, [taskId, memberId]);
    
    if (rows.length === 0) {
      return null;
    }
    
    return formatSubmission(rows[0]);
  } catch (error) {
    logger.error(`根据任务ID和会员ID获取任务提交信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建任务提交
 * @param {Object} submissionData - 任务提交数据
 * @returns {Promise<Object>} 创建结果
 */
async function create(submissionData) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 准备数据
    // 无论content是什么类型，都转换为JSON字符串存储
    let submitContent = submissionData.content;
    if (typeof submitContent === 'object') {
      submitContent = JSON.stringify(submitContent);
    } else if (typeof submitContent === 'string') {
      // 如果已经是字符串，尝试验证是否是有效的JSON
      try {
        JSON.parse(submitContent);
        // 如果是有效的JSON字符串，直接使用
      } catch (e) {
        // 如果不是有效的JSON，则将其转换为JSON格式
        submitContent = JSON.stringify({ rawContent: submitContent });
      }
    } else if (submitContent !== undefined && submitContent !== null) {
      // 如果是其他类型，则转换为字符串后再存储
      submitContent = JSON.stringify({ rawContent: String(submitContent) });
    } else {
      // 如果content为undefined或null，则存储空对象
      submitContent = JSON.stringify({});
    }
    
    const data = {
      task_id: submissionData.taskId,
      member_id: submissionData.memberId,
      submit_content: submitContent,
      submit_time: new Date(),
      create_time: new Date(),
      update_time: new Date()
    };
    
    // 执行插入
    const query = `
      INSERT INTO task_submitted SET ?
    `;
    
    const [result] = await connection.query(query, [data]);
    
    if (result.affectedRows === 0) {
      throw new Error('创建任务提交失败');
    }
    
    // 更新任务的已提交数量 - 这将作为已提交数量的唯一真实来源
    const [taskApplication] = await connection.query(
      `SELECT COUNT(*) as count FROM task_applications 
       WHERE task_id = ? AND status = 'submitted'`,
      [submissionData.taskId]
    );
    
    const submittedCount = taskApplication[0].count || 0;
    
    // 提交事务
    await connection.commit();
    
    // 返回创建的任务提交信息
    return getById(result.insertId);
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`创建任务提交失败: ${error.message}`);
    throw error;
  } finally {
    // 释放连接
    connection.release();
  }
}

/**
 * 批量审核任务提交
 * 注意：该功能当前不可用，因为任务提交表中没有审核相关字段
 * @param {Array} ids - 任务提交ID数组
 * @param {number} reviewStatus - 审核状态 (1: 通过, 2: 拒绝)
 * @param {string} reviewComment - 审核评论
 * @param {number} reviewerId - 审核人ID
 * @returns {Promise<Object>} 审核结果
 */
async function batchReview(ids, reviewStatus, reviewComment, reviewerId) {
  throw new Error('该功能当前不可用，任务提交表中没有审核相关字段');
  // 以下代码保留供将来参考，当数据库表更新后可能会启用
  /*
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('任务提交ID数组不能为空');
    }
    
    // 准备数据
    const data = {
      review_status: reviewStatus,
      review_comment: reviewComment,
      reviewer_id: reviewerId,
      review_time: new Date(),
      update_time: new Date()
    };
    
    // 构建查询条件
    const placeholders = ids.map(() => '?').join(',');
    
    // 执行更新
    const query = `
      UPDATE task_submitted
      SET ?
      WHERE id IN (${placeholders})
    `;
    
    const [result] = await pool.query(query, [data, ...ids]);
    
    return {
      success: true,
      affectedRows: result.affectedRows,
      message: `成功审核 ${result.affectedRows} 条任务提交`
    };
  } catch (error) {
    logger.error(`批量审核任务提交失败: ${error.message}`);
    throw error;
  }
  */
}

module.exports = {
  getList,
  getById,
  getByTaskAndMember,
  create
}; 