/**
 * 向会员表添加密码字段的脚本
 */
const { pool } = require('../src/shared/models/db');
const logger = require('../src/shared/config/logger.config');

async function addPasswordField() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始向会员表添加密码字段...');
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'members' 
      AND COLUMN_NAME = 'password'
    `);
    
    if (columns.length > 0) {
      logger.info('密码字段已存在，无需添加');
      return;
    }
    
    // 添加密码字段
    await connection.query(`
      ALTER TABLE members 
      ADD COLUMN password varchar(100) DEFAULT NULL COMMENT '密码（哈希后）' 
      AFTER member_account
    `);
    
    logger.info('密码字段添加成功');
  } catch (error) {
    logger.error(`添加密码字段失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行脚本
(async () => {
  try {
    await addPasswordField();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
})(); 