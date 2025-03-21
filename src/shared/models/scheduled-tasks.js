/**
 * 定时任务管理模块
 * 集中管理所有需要定期执行的任务
 */
const { updateAllTaskStatus } = require('./task-status-updater');
const logger = require('../config/logger.config');

// 定时任务配置（毫秒）
const TASK_STATUS_UPDATE_INTERVAL = 60000; // 每分钟更新一次任务状态

// 存储定时器ID，用于停止任务
const scheduledTaskIds = {
  taskStatusUpdater: null
};

/**
 * 启动所有定时任务
 */
function startScheduledTasks() {
  logger.info('启动定时任务...');
  
  // 任务状态自动更新定时任务
  scheduledTaskIds.taskStatusUpdater = setInterval(async () => {
    try {
      const updatedCount = await updateAllTaskStatus();
      if (updatedCount > 0) {
        logger.info(`定时任务：自动更新了 ${updatedCount} 个任务的状态`);
      }
    } catch (error) {
      logger.error(`定时任务执行失败: ${error.message}`);
    }
  }, TASK_STATUS_UPDATE_INTERVAL);
  
  logger.info('定时任务启动完成');
}

/**
 * 停止所有定时任务
 */
function stopScheduledTasks() {
  logger.info('停止定时任务...');
  
  // 停止任务状态更新定时任务
  if (scheduledTaskIds.taskStatusUpdater) {
    clearInterval(scheduledTaskIds.taskStatusUpdater);
    scheduledTaskIds.taskStatusUpdater = null;
  }
  
  logger.info('定时任务已停止');
}

module.exports = {
  startScheduledTasks,
  stopScheduledTasks
}; 