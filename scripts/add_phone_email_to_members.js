/**
 * 执行为 members 表添加 phone 和 email 字段的迁移脚本
 */
require('dotenv').config();
const { addPhoneEmailToMembers } = require('../src/shared/models/migrations/add_phone_email_to_members');
const { initDatabase } = require('../src/shared/models/db');
const logger = require('../src/shared/config/logger.config');

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    
    // 执行迁移
    await addPhoneEmailToMembers();
    logger.info('迁移完成：为 members 表添加 phone 和 email 字段');
    process.exit(0);
  } catch (error) {
    logger.error(`迁移失败: ${error.message}`);
    process.exit(1);
  }
}

main(); 