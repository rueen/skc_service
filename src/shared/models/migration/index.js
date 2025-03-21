/**
 * 数据库迁移脚本
 */
const logger = require('../../config/logger.config');
const createTaskApplicationTable = require('./create-task-application-table');

/**
 * 执行所有迁移脚本
 * @returns {Promise<void>}
 */
async function runMigrations() {
  try {
    logger.info('开始执行数据库迁移...');
    
    // 执行创建任务报名表的迁移
    await createTaskApplicationTable();
    
    logger.info('数据库迁移完成');
  } catch (error) {
    logger.error(`数据库迁移失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  runMigrations
}; 