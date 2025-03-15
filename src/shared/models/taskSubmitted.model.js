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
  formattedSubmission.reviewTime = formatDateTime(submission.review_time);
  formattedSubmission.createTime = formatDateTime(submission.create_time);
  formattedSubmission.updateTime = formatDateTime(submission.update_time);
  
  // 转换字段名称为驼峰命名法
  formattedSubmission.taskId = submission.task_id;
  formattedSubmission.memberId = submission.member_id;
  formattedSubmission.memberName = submission.member_name;
  formattedSubmission.taskName = submission.task_name;
  formattedSubmission.reviewStatus = submission.review_status;
  formattedSubmission.reviewComment = submission.review_comment;
  formattedSubmission.reviewerId = submission.reviewer_id;
  formattedSubmission.reviewerName = submission.reviewer_name;
  
  // 安全解析 JSON 字段
  try {
    if (typeof submission.content === 'string' && submission.content.trim()) {
      formattedSubmission.content = JSON.parse(submission.content);
    } else if (typeof submission.content === 'object') {
      formattedSubmission.content = submission.content;
    } else {
      formattedSubmission.content = {};
    }
  } catch (error) {
    logger.error(`解析 content 失败: ${error.message}, 原始值: ${submission.content}`);
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
    
    if (filters.reviewStatus !== undefined) {
      whereClause += ' AND ts.review_status = ?';
      queryParams.push(filters.reviewStatus);
    }
    
    // 构建查询语句
    const query = `
      SELECT ts.*, t.task_name, m.nickname as member_name, w.nickname as reviewer_name
      FROM task_submitted ts
      LEFT JOIN task t ON ts.task_id = t.id
      LEFT JOIN member m ON ts.member_id = m.id
      LEFT JOIN waiter w ON ts.reviewer_id = w.id
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
      SELECT ts.*, t.task_name, m.nickname as member_name, w.nickname as reviewer_name
      FROM task_submitted ts
      LEFT JOIN task t ON ts.task_id = t.id
      LEFT JOIN member m ON ts.member_id = m.id
      LEFT JOIN waiter w ON ts.reviewer_id = w.id
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
      SELECT ts.*, t.task_name, m.nickname as member_name, w.nickname as reviewer_name
      FROM task_submitted ts
      LEFT JOIN task t ON ts.task_id = t.id
      LEFT JOIN member m ON ts.member_id = m.id
      LEFT JOIN waiter w ON ts.reviewer_id = w.id
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
  try {
    // 准备数据
    const content = typeof submissionData.content === 'object' 
      ? JSON.stringify(submissionData.content) 
      : submissionData.content;
    
    const data = {
      task_id: submissionData.taskId,
      member_id: submissionData.memberId,
      content: content,
      submit_time: new Date(),
      review_status: 0, // 待审核
      create_time: new Date(),
      update_time: new Date()
    };
    
    // 执行插入
    const query = `
      INSERT INTO task_submitted SET ?
    `;
    
    const [result] = await pool.query(query, [data]);
    
    if (result.affectedRows === 0) {
      throw new Error('创建任务提交失败');
    }
    
    // 返回创建的任务提交信息
    return getById(result.insertId);
  } catch (error) {
    logger.error(`创建任务提交失败: ${error.message}`);
    throw error;
  }
}

/**
 * 批量审核任务提交
 * @param {Array} ids - 任务提交ID数组
 * @param {number} reviewStatus - 审核状态 (1: 通过, 2: 拒绝)
 * @param {string} reviewComment - 审核评论
 * @param {number} reviewerId - 审核人ID
 * @returns {Promise<Object>} 审核结果
 */
async function batchReview(ids, reviewStatus, reviewComment, reviewerId) {
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
}

module.exports = {
  getList,
  getById,
  getByTaskAndMember,
  create,
  batchReview
}; 