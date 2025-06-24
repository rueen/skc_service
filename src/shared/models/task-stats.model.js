/**
 * 任务统计模型
 * 处理会员任务相关的统计数据
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const { BillType, TaskAuditStatus } = require('../config/enums');

/**
 * 获取会员已完成任务的次数
 * @param {number} memberId - 会员ID
 * @returns {Promise<number>} 已完成任务的次数
 */
async function getMemberCompletedTaskCount(memberId) {
  try {
    // 获取已通过审核的任务数量
    const [result] = await pool.query(
      'SELECT COUNT(*) as count FROM submitted_tasks WHERE member_id = ? AND task_audit_status = ?',
      [memberId, TaskAuditStatus.APPROVED]
    );
    
    return result[0].count || 0;
  } catch (error) {
    logger.error(`获取会员已完成任务次数失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员任务数据统计
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 任务统计数据
 */
async function getMemberTaskStats(memberId) {
  try {
    // 获取完成任务次数，复用getMemberCompletedTaskCount函数
    const completedTaskCount = await getMemberCompletedTaskCount(memberId);
    
    // 获取累计任务奖励
    const [totalTaskRewardResult] = await pool.query(
      `SELECT SUM(amount) as totalTaskReward 
       FROM bills 
       WHERE member_id = ? AND bill_type = ?`,
      [memberId, BillType.TASK_REWARD]
    );
    
    return {
      completedTaskCount: completedTaskCount,
      totalTaskReward: parseFloat(totalTaskRewardResult[0].totalTaskReward || 0).toFixed(2)
    };
  } catch (error) {
    logger.error(`获取会员任务数据统计失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getMemberTaskStats,
  getMemberCompletedTaskCount
}; 