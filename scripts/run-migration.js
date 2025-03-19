/**
 * 运行SQL迁移脚本
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/shared/models/db');
const logger = require('../src/shared/config/logger.config');

async function runMigration() {
  try {
    logger.info('开始执行数据库迁移...');
    
    // 读取迁移脚本
    const sqlFile = path.join(__dirname, '../migrations/add_custom_fields_to_channels.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // 执行SQL
    const connection = await pool.getConnection();
    try {
      await connection.query(sql);
      logger.info('数据库迁移成功完成');
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error(`数据库迁移失败: ${error.message}`);
    process.exit(1);
  }
}

// 执行迁移
runMigration().then(() => {
  logger.info('迁移完成，退出程序');
  process.exit(0);
}); 