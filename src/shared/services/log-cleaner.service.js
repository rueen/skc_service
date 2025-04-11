/**
 * 日志清理服务
 * 负责定期清理和压缩旧日志文件
 */
const logger = require('../config/logger.config');
const cron = require('node-cron');
const path = require('path');
const { spawn } = require('child_process');
const { cleanOldLogs, compressOldLogs } = require('../utils/log-cleaner.util');

let logCleanupTask = null;

/**
 * 执行日志清理
 * 调用日志清理函数来清理和压缩旧日志
 */
async function cleanupLogs() {
  try {
    logger.info('开始执行日志清理任务...');
    
    // 直接调用工具函数而不是通过子进程
    cleanOldLogs();
    compressOldLogs();
    
    logger.info('日志清理任务成功完成');
    return { success: true };
  } catch (error) {
    logger.error(`执行日志清理时出错: ${error.message}`);
    throw error;
  }
}

/**
 * 开始日志清理定时任务
 * 根据配置的cron表达式调度日志清理任务
 * @param {Object} options - 配置选项
 * @param {string} options.schedule - cron 表达式
 * @param {boolean} options.runImmediately - 是否在启动时立即执行一次
 */
function startLogCleanupScheduler(options = {}) {
  try {
    const { schedule, runImmediately = false } = options;
    
    if (!schedule) {
      logger.error('启动日志清理定时任务失败：缺少cron表达式');
      return null;
    }
    
    // 验证cron表达式
    if (!cron.validate(schedule)) {
      logger.error(`启动日志清理定时任务失败：无效的cron表达式 "${schedule}"`);
      return null;
    }
    
    // 停止已有的定时任务
    if (logCleanupTask) {
      logCleanupTask.stop();
      logger.info('已停止之前的日志清理定时任务');
    }
    
    // 创建新的定时任务
    logCleanupTask = cron.schedule(schedule, async () => {
      try {
        await cleanupLogs();
      } catch (error) {
        logger.error(`日志清理定时任务执行失败: ${error.message}`);
      }
    });
    
    logger.info(`日志清理定时任务已启动，调度表达式: ${schedule}`);
    
    // 如果配置为立即执行，则立即运行一次任务
    if (runImmediately) {
      setTimeout(async () => {
        try {
          await cleanupLogs();
        } catch (error) {
          logger.error(`立即执行日志清理失败: ${error.message}`);
        }
      }, 2000); // 延迟2秒执行，避免与应用启动冲突
    }
    
    return logCleanupTask;
  } catch (error) {
    logger.error(`启动日志清理定时任务失败: ${error.message}`);
    return null;
  }
}

/**
 * 停止日志清理定时任务
 */
function stopLogCleanupScheduler() {
  try {
    if (logCleanupTask) {
      logCleanupTask.stop();
      logCleanupTask = null;
      logger.info('日志清理定时任务已停止');
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`停止日志清理定时任务失败: ${error.message}`);
    return false;
  }
}

/**
 * 检查日志清理定时任务是否正在运行
 */
function isLogCleanupSchedulerRunning() {
  return logCleanupTask !== null;
}

module.exports = {
  cleanupLogs,
  startLogCleanupScheduler,
  stopLogCleanupScheduler,
  isLogCleanupSchedulerRunning
}; 