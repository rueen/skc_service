/**
 * 会员账户余额模型
 * 处理会员账户余额相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 更新会员账户表结构，添加余额字段
 * @returns {Promise<boolean>} 操作结果
 */
async function updateMembersTableAddBalance() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查余额字段是否存在
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'members' AND COLUMN_NAME = 'balance'",
      [process.env.DB_DATABASE]
    );
    
    // 如果余额字段不存在，添加它
    if (columns.length === 0) {
      logger.info('members表中不存在balance字段，将添加该字段');
      await connection.query(`
        ALTER TABLE members 
        ADD COLUMN balance decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '账户余额' AFTER gender
      `);
      logger.info('balance字段添加成功');
    } else {
      logger.info('balance字段已存在');
    }
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`更新members表结构失败: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * 获取会员账户余额
 * @param {number} memberId - 会员ID
 * @returns {Promise<number>} 账户余额
 */
async function getBalance(memberId) {
  try {
    const [rows] = await pool.query(
      'SELECT balance FROM members WHERE id = ?',
      [memberId]
    );
    
    if (rows.length === 0) {
      throw new Error('会员不存在');
    }
    
    return parseFloat(rows[0].balance);
  } catch (error) {
    logger.error(`获取会员账户余额失败: ${error.message}`);
    throw error;
  }
}

/**
 * 更新会员账户余额
 * @param {number} memberId - 会员ID
 * @param {number} amount - 金额（正值为增加，负值为减少）
 * @param {Object} options - 其他选项
 * @param {string} options.transactionType - 交易类型，用于记录日志
 * @param {Object} options.connection - 可选的数据库连接，用于事务中的操作
 * @returns {Promise<boolean>} 操作结果
 */
async function updateBalance(memberId, amount, options = {}) {
  const { transactionType = '未知交易', connection: existingConnection = null } = options;
  const shouldReleaseConnection = !existingConnection;
  const connection = existingConnection || await pool.getConnection();
  
  try {
    if (shouldReleaseConnection) {
      await connection.beginTransaction();
    }
    
    // 检查会员是否存在
    const [members] = await connection.query(
      'SELECT id, balance FROM members WHERE id = ?',
      [memberId]
    );
    
    if (members.length === 0) {
      throw new Error('会员不存在');
    }
    
    const currentBalance = parseFloat(members[0].balance);
    const newBalance = currentBalance + parseFloat(amount);
    
    // 如果是减少余额，确保账户余额足够
    if (amount < 0 && newBalance < 0) {
      throw new Error('账户余额不足');
    }
    
    // 更新余额
    await connection.query(
      'UPDATE members SET balance = ? WHERE id = ?',
      [newBalance.toFixed(2), memberId]
    );
    
    // 记录余额变动日志
    await connection.query(
      `INSERT INTO balance_logs 
       (member_id, amount, before_balance, after_balance, transaction_type, create_time) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [memberId, amount, currentBalance.toFixed(2), newBalance.toFixed(2), transactionType]
    );
    
    if (shouldReleaseConnection) {
      await connection.commit();
    }
    
    return true;
  } catch (error) {
    if (shouldReleaseConnection) {
      await connection.rollback();
    }
    logger.error(`更新会员账户余额失败: ${error.message}`);
    throw error;
  } finally {
    if (shouldReleaseConnection) {
      connection.release();
    }
  }
}

/**
 * 创建余额变动日志表
 * @returns {Promise<boolean>} 操作结果
 */
async function createBalanceLogsTable() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 检查表是否存在
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'balance_logs'",
      [process.env.DB_DATABASE]
    );
    
    if (tables.length === 0) {
      logger.info('balance_logs表不存在，将创建该表');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS balance_logs (
          id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '日志ID',
          member_id bigint(20) NOT NULL COMMENT '会员ID',
          amount decimal(10,2) NOT NULL COMMENT '变动金额',
          before_balance decimal(10,2) NOT NULL COMMENT '变动前余额',
          after_balance decimal(10,2) NOT NULL COMMENT '变动后余额',
          transaction_type varchar(50) NOT NULL COMMENT '交易类型',
          create_time datetime NOT NULL COMMENT '创建时间',
          PRIMARY KEY (id),
          KEY idx_member_id (member_id),
          KEY idx_create_time (create_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='余额变动日志表';
      `);
      logger.info('balance_logs表创建成功');
    } else {
      logger.info('balance_logs表已存在');
    }
    
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    logger.error(`创建balance_logs表失败: ${error.message}`);
    return false;
  } finally {
    connection.release();
  }
}

// 初始化必要的表结构
async function init() {
  try {
    await updateMembersTableAddBalance();
    await createBalanceLogsTable();
    return true;
  } catch (error) {
    logger.error(`初始化余额相关表结构失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  init,
  getBalance,
  updateBalance
}; 