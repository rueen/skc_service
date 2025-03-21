/**
 * 创建任务报名表的迁移脚本
 */
const { pool } = require('../db');
const logger = require('../../config/logger.config');

async function createTaskApplicationTable() {
  try {
    logger.info('开始创建任务报名表...');
    
    // 检查表是否已经存在
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'task_applications'
    `);
    
    if (tables.length > 0) {
      logger.info('任务报名表已存在，跳过创建');
      return;
    }
    
    // 创建任务报名表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`task_applications\` (
        \`id\` bigint(20) NOT NULL AUTO_INCREMENT COMMENT '报名ID',
        \`task_id\` bigint(20) NOT NULL COMMENT '关联任务ID',
        \`member_id\` bigint(20) NOT NULL COMMENT '关联会员ID',
        \`status\` varchar(20) NOT NULL DEFAULT 'applied' COMMENT '状态：applied-已报名，submitted-已提交，completed-已完成',
        \`apply_time\` datetime NOT NULL COMMENT '报名时间',
        \`create_time\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`update_time\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        KEY \`idx_task_id\` (\`task_id\`),
        KEY \`idx_member_id\` (\`member_id\`),
        KEY \`idx_status\` (\`status\`),
        UNIQUE KEY \`uk_task_member\` (\`task_id\`, \`member_id\`),
        KEY \`idx_create_time\` (\`create_time\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务报名表'
    `);
    
    logger.info('任务报名表创建成功');
    
    // 同步已有的任务提交数据到报名表
    logger.info('开始同步已有任务提交数据到报名表...');
    
    await pool.query(`
      INSERT IGNORE INTO task_applications 
      (task_id, member_id, status, apply_time, create_time, update_time)
      SELECT 
        task_id, 
        member_id, 
        CASE 
          WHEN task_audit_status = 'approved' THEN 'completed'
          ELSE 'submitted'
        END as status,
        COALESCE(apply_time, submit_time, create_time) as apply_time,
        create_time,
        update_time
      FROM task_submitted
    `);
    
    logger.info('同步任务提交数据到报名表完成');
    
    return true;
  } catch (error) {
    logger.error(`创建任务报名表失败: ${error.message}`);
    throw error;
  }
}

module.exports = createTaskApplicationTable; 