/**
 * 任务统计模型
 * 处理会员任务相关的统计数据
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { BillType, TaskAuditStatus } = require('../config/enums');

/**
 * 获取会员任务数据统计
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 任务统计数据
 */
async function getMemberTaskStats(memberId) {
  try {
    // 获取完成任务次数
    const [completedTaskCountResult] = await pool.query(
      'SELECT COUNT(*) as completedTaskCount FROM submitted_tasks WHERE member_id = ? AND task_audit_status = ?',
      [memberId, TaskAuditStatus.APPROVED]
    );
    
    // 获取累计任务奖励
    const [totalTaskRewardResult] = await pool.query(
      `SELECT SUM(amount) as totalTaskReward 
       FROM bills 
       WHERE member_id = ? AND bill_type = ?`,
      [memberId, BillType.TASK_REWARD]
    );
    
    return {
      completedTaskCount: completedTaskCountResult[0].completedTaskCount || 0,
      totalTaskReward: parseFloat(totalTaskRewardResult[0].totalTaskReward || 0).toFixed(2)
    };
  } catch (error) {
    logger.error(`获取会员任务数据统计失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getMemberTaskStats
}; 