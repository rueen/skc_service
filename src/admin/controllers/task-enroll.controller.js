/**
 * 任务报名管理控制器
 * 处理管理后台任务报名相关业务逻辑
 */
const { pool } = require('../../shared/models/db');
const logger = require('../../shared/config/logger.config');
const { formatDateTime } = require('../../shared/utils/date.util');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取任务报名列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getEnrollmentList(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, taskId, memberId, memberName } = req.query;
    
    let query = `
      SELECT et.*, t.task_name, m.nickname, m.mobile
      FROM enrolled_tasks et
      LEFT JOIN tasks t ON et.task_id = t.id
      LEFT JOIN members m ON et.member_id = m.id
      WHERE 1=1
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM enrolled_tasks et WHERE 1=1';
    const queryParams = [];
    
    // 添加筛选条件
    if (taskId) {
      query += ' AND et.task_id = ?';
      countQuery += ' AND et.task_id = ?';
      queryParams.push(parseInt(taskId, 10));
    }
    
    if (memberId) {
      query += ' AND et.member_id = ?';
      countQuery += ' AND et.member_id = ?';
      queryParams.push(parseInt(memberId, 10));
    }
    
    if (memberName) {
      query += ' AND m.nickname LIKE ?';
      queryParams.push(`%${memberName}%`);
    }
    
    // 添加排序和分页
    query += ' ORDER BY et.enroll_time DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(pageSize, 10), (parseInt(page, 10) - 1) * parseInt(pageSize, 10));
    
    // 执行查询
    const [rows] = await pool.query(query, queryParams);
    
    // 获取总数
    const [countResult] = await pool.query(countQuery, queryParams.slice(0, memberName ? -3 : -2));
    const total = countResult[0].total;
    
    // 格式化数据
    const formattedList = rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      taskName: row.task_name,
      memberId: row.member_id,
      memberName: row.nickname,
      memberMobile: row.mobile,
      enrollTime: formatDateTime(row.enroll_time),
      createTime: formatDateTime(row.create_time),
      updateTime: formatDateTime(row.update_time)
    }));
    
    return responseUtil.success(res, {
      total,
      list: formattedList,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    }, '获取任务报名列表成功');
  } catch (error) {
    logger.error(`获取任务报名列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取任务报名列表失败，请稍后重试');
  }
}

/**
 * 删除任务报名记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deleteEnrollment(req, res) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    if (!id) {
      await connection.release();
      return responseUtil.badRequest(res, '报名ID不能为空');
    }
    
    // 验证报名记录是否存在
    const [enrolls] = await connection.query(
      'SELECT id FROM enrolled_tasks WHERE id = ?',
      [id]
    );
    
    if (enrolls.length === 0) {
      throw new Error('报名记录不存在');
    }
    
    // 删除报名记录
    const [result] = await connection.query(
      'DELETE FROM enrolled_tasks WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    return responseUtil.success(res, {
      success: result.affectedRows > 0
    }, '删除任务报名记录成功');
  } catch (error) {
    await connection.rollback();
    logger.error(`删除任务报名记录失败: ${error.message}`);
    
    if (error.message === '报名记录不存在') {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '删除任务报名记录失败，请稍后重试');
  } finally {
    connection.release();
  }
}

/**
 * 获取任务报名统计信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getEnrollmentStats(req, res) {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      return responseUtil.badRequest(res, '任务ID不能为空');
    }
    
    // 查询任务基本信息
    const [taskResult] = await pool.query(
      'SELECT id, task_name, quota, unlimited_quota FROM tasks WHERE id = ?',
      [taskId]
    );
    
    if (taskResult.length === 0) {
      return responseUtil.notFound(res, '任务不存在');
    }
    
    const task = taskResult[0];
    
    // 查询报名人数
    const [enrollCountResult] = await pool.query(
      'SELECT COUNT(*) as count FROM enrolled_tasks WHERE task_id = ?',
      [taskId]
    );
    
    const enrollCount = enrollCountResult[0].count;
    
    // 每日报名趋势（最近7天）
    const [dailyTrendResult] = await pool.query(
      `SELECT 
        DATE(enroll_time) as date, 
        COUNT(*) as count 
      FROM 
        enrolled_tasks 
      WHERE 
        task_id = ? AND 
        enroll_time >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY 
        DATE(enroll_time)
      ORDER BY 
        date ASC`,
      [taskId]
    );
    
    // 格式化日期
    const dailyTrend = dailyTrendResult.map(item => ({
      date: item.date,
      count: item.count
    }));
    
    return responseUtil.success(res, {
      taskId: task.id,
      taskName: task.task_name,
      totalQuota: task.unlimited_quota ? null : task.quota,
      enrollCount,
      remainingQuota: task.unlimited_quota ? null : Math.max(0, task.quota - enrollCount),
      dailyTrend
    }, '获取任务报名统计信息成功');
  } catch (error) {
    logger.error(`获取任务报名统计信息失败: ${error.message}`);
    return responseUtil.serverError(res, '获取任务报名统计信息失败，请稍后重试');
  }
}

module.exports = {
  getEnrollmentList,
  deleteEnrollment,
  getEnrollmentStats
}; 