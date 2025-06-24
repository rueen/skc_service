/**
 * 任务状态定时更新服务
 * 负责定期检查和更新任务状态（未开始/进行中/已结束）
 */
const { pool } = require('../models/db');
const { logger } = require('../config/logger.config');
const { TaskStatus } = require('../config/enums');
const cron = require('node-cron');

let scheduledTask = null;

/**
 * 将未开始状态更新为进行中状态
 * @returns {Promise<number>} 更新的记录数
 */
async function updateTasksToProcessing(connection) {
  // 获取当前时间（使用本地时间而不是UTC时间）
  const now = new Date();
  // 格式化为 YYYY-MM-DD HH:MM:SS 格式
  const currentTime = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
  
  // 将未开始状态且开始时间已过的任务更新为进行中
  const [result] = await connection.query(
    `UPDATE tasks 
     SET task_status = ? 
     WHERE task_status = ? 
     AND start_time <= ? 
     AND end_time > ?`,
    [TaskStatus.PROCESSING, TaskStatus.NOT_STARTED, currentTime, currentTime]
  );
  
  return result.affectedRows;
}

/**
 * 将进行中状态更新为已结束状态
 * @returns {Promise<number>} 更新的记录数
 */
async function updateTasksToEnded(connection) {
  // 获取当前时间（使用本地时间而不是UTC时间）
  const now = new Date();
  // 格式化为 YYYY-MM-DD HH:MM:SS 格式
  const currentTime = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
  
  // 将进行中状态且结束时间已过的任务更新为已结束
  const [result] = await connection.query(
    `UPDATE tasks 
     SET task_status = ? 
     WHERE task_status = ? 
     AND end_time <= ?`,
    [TaskStatus.ENDED, TaskStatus.PROCESSING, currentTime]
  );
  
  return result.affectedRows;
}

/**
 * 更新任务状态
 * 根据任务的开始和结束时间自动更新任务状态
 */
async function updateTaskStatus() {
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 1000; // 1秒
  
  while (retryCount <= maxRetries) {
    const connection = await pool.getConnection();
    try {
      logger.info('开始更新任务状态');
      
      // 开始事务
      await connection.beginTransaction();
      
      // 分开执行两个更新操作，减少锁持有时间
      const updatedToProcessing = await updateTasksToProcessing(connection);
      const updatedToEnded = await updateTasksToEnded(connection);
      
      // 提交事务
      await connection.commit();
      
      logger.info(`任务状态更新完成: ${updatedToProcessing} 个任务从未开始更新为进行中, ${updatedToEnded} 个任务从进行中更新为已结束`);
      
      return {
        success: true,
        updatedToProcessing,
        updatedToEnded
      };
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      
      // 处理锁超时错误
      if (error.message.includes('Lock wait timeout exceeded') && retryCount < maxRetries) {
        retryCount++;
        logger.warn(`更新任务状态时发生锁超时，进行第 ${retryCount} 次重试...`);
        // 释放连接
        connection.release();
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
        continue;
      }
      
      logger.error(`更新任务状态时发生错误: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // 确保连接释放
      if (connection) {
        connection.release();
      }
    }
  }
  
  // 所有重试都失败
  logger.error(`更新任务状态失败：已重试 ${maxRetries} 次`);
  return {
    success: false,
    error: `锁超时，已重试 ${maxRetries} 次仍然失败`
  };
}

/**
 * 开始定时任务调度
 * @param {Object} options - 调度选项
 * @param {string} options.schedule - cron 表达式 (例如: '0 0,3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57 * * * *' 表示每3分钟执行一次)
 * @param {boolean} options.runImmediately - 是否立即执行一次
 */
function startScheduler(options = {}) {
  try {
    const { schedule, runImmediately = false } = options;
    
    if (!schedule) {
      logger.error('启动定时任务失败：缺少cron表达式');
      return null;
    }
    
    // 验证cron表达式
    if (!cron.validate(schedule)) {
      logger.error(`启动定时任务失败：无效的cron表达式 "${schedule}"`);
      return null;
    }
    
    // 如果已存在调度任务，先停止它
    if (scheduledTask) {
      scheduledTask.stop();
      logger.info('已停止之前的任务状态更新定时任务');
    }
    
    // 创建新的定时任务
    scheduledTask = cron.schedule(schedule, async () => {
      try {
        await updateTaskStatus();
      } catch (error) {
        logger.error(`定时任务执行失败: ${error.message}`);
      }
    });
    
    logger.info(`任务状态更新定时任务已启动，调度表达式: ${schedule}`);
    
    // 如果需要立即运行一次
    if (runImmediately) {
      updateTaskStatus().then(result => {
        if (result.success) {
          logger.info('初始任务状态更新完成');
        }
      }).catch(error => {
        logger.error(`初始任务状态更新失败: ${error.message}`);
      });
    }
    
    return scheduledTask;
  } catch (error) {
    logger.error(`启动定时任务失败: ${error.message}`);
    return null;
  }
}

/**
 * 停止定时任务调度
 */
function stopScheduler() {
  try {
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
      logger.info('任务状态更新定时任务已停止');
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`停止定时任务失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查任务调度器是否正在运行
 * @returns {boolean} 是否有任务在运行
 */
function isSchedulerRunning() {
  return scheduledTask !== null;
}

module.exports = {
  updateTaskStatus,
  startScheduler,
  stopScheduler,
  isSchedulerRunning
}; 