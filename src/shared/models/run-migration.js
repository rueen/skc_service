/**
 * 手动执行数据迁移脚本
 */
const { migrateMemberGroups } = require('./migration');
const logger = require('../config/logger.config');

async function runMigration() {
  try {
    logger.info('开始执行数据迁移...');
    
    // 迁移会员群组关系数据
    const result = await migrateMemberGroups();
    
    if (result.success) {
      logger.info(result.message);
    } else {
      logger.error(result.message);
    }
    
    logger.info('数据迁移执行完成');
    process.exit(0);
  } catch (error) {
    logger.error(`数据迁移执行失败: ${error.message}`);
    process.exit(1);
  }
}

runMigration(); 