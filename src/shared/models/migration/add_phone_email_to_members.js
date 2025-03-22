/**
 * 为 members 表添加 phone 和 email 字段的迁移脚本
 */
const { pool } = require('../db');
const logger = require('../../config/logger.config');

async function addPhoneEmailToMembers() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查 phone 字段是否已存在
    const [phoneColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'members'
      AND COLUMN_NAME = 'phone'
    `);

    // 如果 phone 字段不存在，则添加
    if (phoneColumns.length === 0) {
      await connection.query(`
        ALTER TABLE members
        ADD COLUMN phone varchar(20) DEFAULT NULL COMMENT '手机号'
      `);
      logger.info('成功为 members 表添加 phone 字段');
    } else {
      logger.info('members 表已存在 phone 字段，无需添加');
    }

    // 检查 email 字段是否已存在
    const [emailColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'members'
      AND COLUMN_NAME = 'email'
    `);

    // 如果 email 字段不存在，则添加
    if (emailColumns.length === 0) {
      await connection.query(`
        ALTER TABLE members
        ADD COLUMN email varchar(100) DEFAULT NULL COMMENT '邮箱'
      `);
      logger.info('成功为 members 表添加 email 字段');
    } else {
      logger.info('members 表已存在 email 字段，无需添加');
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`为 members 表添加 phone 和 email 字段失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  addPhoneEmailToMembers
}; 