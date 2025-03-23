/**
 * 创建已提交任务表
 * 执行方法: node src/shared/migrations/create_submitted_tasks_table.js
 */
const mysql = require('mysql2/promise');
const config = require('../config/db.config');
const logger = require('../config/logger.config');

async function createSubmittedTasksTable() {
  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database
    });
    
    logger.info('数据库连接成功，开始检查相关表结构...');
    
    // 检查tasks、members和waiters表的id字段类型
    const [tasksColumns] = await connection.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'id'",
      [config.database]
    );
    
    const [membersColumns] = await connection.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'members' AND COLUMN_NAME = 'id'",
      [config.database]
    );
    
    const [waitersColumns] = await connection.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'waiters' AND COLUMN_NAME = 'id'",
      [config.database]
    );
    
    if (tasksColumns.length === 0 || membersColumns.length === 0) {
      throw new Error('任务表或会员表不存在，请先创建这些表');
    }
    
    if (waitersColumns.length === 0) {
      logger.warn('管理员表不存在，waiter_id将不会设置外键约束');
    }
    
    logger.info(`任务表id类型: ${tasksColumns[0].COLUMN_TYPE}, 会员表id类型: ${membersColumns[0].COLUMN_TYPE}`);
    if (waitersColumns.length > 0) {
      logger.info(`管理员表id类型: ${waitersColumns[0].COLUMN_TYPE}`);
    }
    
    // 先检查表是否已存在
    const [existingTable] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'submitted_tasks'",
      [config.database]
    );
    
    if (existingTable.length > 0) {
      logger.info('submitted_tasks表已存在，将进行删除后重新创建');
      await connection.execute('DROP TABLE IF EXISTS submitted_tasks');
    }
    
    // 根据waiters表是否存在决定是否添加外键约束
    let waitersConstraint = '';
    if (waitersColumns.length > 0) {
      waitersConstraint = 'FOREIGN KEY (waiter_id) REFERENCES waiters(id) ON DELETE SET NULL,';
    }
    
    // 创建表的SQL - 使用BIGINT类型
    logger.info('开始创建submitted_tasks表...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS submitted_tasks (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        task_id BIGINT NOT NULL,
        member_id BIGINT NOT NULL,
        submit_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submit_content JSON NOT NULL,
        task_audit_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        waiter_id BIGINT,
        reject_reason TEXT,
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_task_id (task_id),
        INDEX idx_member_id (member_id),
        INDEX idx_waiter_id (waiter_id),
        INDEX idx_task_audit_status (task_audit_status),
        ${waitersConstraint}
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    // 执行创建表SQL
    await connection.execute(createTableSQL);
    
    logger.info('submitted_tasks表创建成功');
    if (waitersColumns.length > 0) {
      logger.info('已为waiter_id添加外键约束');
    } else {
      logger.info('waiter_id未添加外键约束');
    }
    
    // 成功退出
    process.exit(0);
  } catch (error) {
    logger.error(`创建submitted_tasks表失败: ${error.message}`);
    // 失败退出
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行迁移
createSubmittedTasksTable(); 