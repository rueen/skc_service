/*
 * @Author: diaochan
 * @Date: 2025-03-17 18:18:43
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-17 18:19:19
 * @Description: 
 */
/**
 * 为 members 表添加 avatar, gender, telegram 字段的迁移脚本
 */
const { pool } = require('../db');
const logger = require('../../config/logger.config');

async function addMemberFields() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查 avatar 字段是否已存在
    const [avatarColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'members'
      AND COLUMN_NAME = 'avatar'
    `);

    // 如果 avatar 字段不存在，则添加
    if (avatarColumns.length === 0) {
      await connection.query(`
        ALTER TABLE members
        ADD COLUMN avatar varchar(255) DEFAULT NULL COMMENT '头像URL'
      `);
      logger.info('成功为 members 表添加 avatar 字段');
    } else {
      logger.info('members 表已存在 avatar 字段，无需添加');
    }

    // 检查 gender 字段是否已存在
    const [genderColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'members'
      AND COLUMN_NAME = 'gender'
    `);

    // 如果 gender 字段不存在，则添加
    if (genderColumns.length === 0) {
      await connection.query(`
        ALTER TABLE members
        ADD COLUMN gender tinyint(1) DEFAULT 2 COMMENT '性别：0-男，1-女，2-保密'
      `);
      logger.info('成功为 members 表添加 gender 字段');
    } else {
      logger.info('members 表已存在 gender 字段，无需添加');
    }

    // 检查 telegram 字段是否已存在
    const [telegramColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'members'
      AND COLUMN_NAME = 'telegram'
    `);

    // 如果 telegram 字段不存在，则添加
    if (telegramColumns.length === 0) {
      await connection.query(`
        ALTER TABLE members
        ADD COLUMN telegram varchar(100) DEFAULT NULL COMMENT 'Telegram账号'
      `);
      logger.info('成功为 members 表添加 telegram 字段');
    } else {
      logger.info('members 表已存在 telegram 字段，无需添加');
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`为 members 表添加字段失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  addMemberFields
}; 