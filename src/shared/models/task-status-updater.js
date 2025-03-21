/**
 * 任务状态自动更新定时任务
 * 每分钟执行一次，检查所有任务的开始时间和结束时间，自动更新任务状态
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { TaskStatus } = require('../config/enums');

/**
 * 更新所有任务的状态
 * @returns {Promise<number>} 更新的任务数量
 */
async function updateAllTaskStatus() {
  try {
    logger.info('开始任务状态自动更新...');
    
    const now = new Date();
    let updatedCount = 0;
    
    // 更新未开始状态的任务为进行中
    const [processingResult] = await pool.query(
      `UPDATE tasks 
       SET task_status = ? 
       WHERE task_status = ? 
         AND start_time <= ? 
         AND end_time > ?`,
      [TaskStatus.PROCESSING, TaskStatus.NOT_STARTED, now, now]
    );
    
    updatedCount += processingResult.affectedRows;
    
    if (processingResult.affectedRows > 0) {
      logger.info(`已将 ${processingResult.affectedRows} 个任务状态从 "未开始" 更新为 "进行中"`);
    }
    
    // 更新进行中状态的任务为已结束
    const [endedResult] = await pool.query(
      `UPDATE tasks 
       SET task_status = ? 
       WHERE task_status = ? 
         AND end_time <= ?`,
      [TaskStatus.ENDED, TaskStatus.PROCESSING, now]
    );
    
    updatedCount += endedResult.affectedRows;
    
    if (endedResult.affectedRows > 0) {
      logger.info(`已将 ${endedResult.affectedRows} 个任务状态从 "进行中" 更新为 "已结束"`);
    }
    
    // 确保未开始的任务，如果已过结束时间，直接标记为已结束
    const [directEndedResult] = await pool.query(
      `UPDATE tasks 
       SET task_status = ? 
       WHERE task_status = ? 
         AND end_time <= ?`,
      [TaskStatus.ENDED, TaskStatus.NOT_STARTED, now]
    );
    
    updatedCount += directEndedResult.affectedRows;
    
    if (directEndedResult.affectedRows > 0) {
      logger.info(`已将 ${directEndedResult.affectedRows} 个任务状态从 "未开始" 直接更新为 "已结束"（已超过结束时间）`);
    }
    
    logger.info(`任务状态自动更新完成，共更新 ${updatedCount} 个任务状态`);
    
    return updatedCount;
  } catch (error) {
    logger.error(`任务状态自动更新失败: ${error.message}`);
    throw error;
  }
}

// 导出函数，可以在应用启动时定期执行
module.exports = {
  updateAllTaskStatus
}; 