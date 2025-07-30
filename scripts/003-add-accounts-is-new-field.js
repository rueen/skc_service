/**
 * 数据库迁移脚本：为accounts表添加is_new字段并处理历史数据
 * 迁移规则：
 * - 如果 submitted_tasks 表中存在由该账号提交的任务，且该任务的任务审核状态（task_audit_status）为已通过（approved），则该账号为老账号
 * - submitted_tasks 表中的 member_id 对应 accounts 表中的 member_id
 * - submitted_tasks 表中的 task_id 对应 tasks 表中的 id
 * - tasks 表中的 channel_id 对应 accounts 表中的 channel_id
 */
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { pool } = require('../src/shared/models/db');
const { logger } = require('../src/shared/config/logger.config');

async function migrate() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    logger.info('开始执行账号is_new字段迁移...');
    
    // 1. 首先检查is_new字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'is_new'
    `);
    
    if (columns.length === 0) {
      // 2. 添加is_new字段（如果不存在）
      logger.info('添加is_new字段到accounts表...');
      await connection.query(`
        ALTER TABLE accounts 
        ADD COLUMN is_new tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否新账号：0-老账号，1-新账号'
        AFTER submit_time
      `);
      
      // 3. 添加索引
      logger.info('为is_new字段添加索引...');
      await connection.query(`
        ALTER TABLE accounts 
        ADD INDEX idx_is_new (is_new)
      `);
    } else {
      logger.info(`is_new字段已存在，当前类型: ${columns[0].COLUMN_TYPE}，跳过字段添加步骤`);
    }
    
    // 4. 更新历史数据：将有已通过审核任务的账号或uid在old_accounts_fb表中存在的账号标记为老账号
    logger.info('更新历史数据：标记老账号...');
    const updateSql = `
      UPDATE accounts a 
      SET is_new = 0 
      WHERE (
        -- 条件1：账号所属会员在同渠道下有已通过审核的任务提交记录
        EXISTS (
          SELECT 1 
          FROM submitted_tasks st 
          INNER JOIN tasks t ON st.task_id = t.id 
          WHERE st.member_id = a.member_id 
            AND t.channel_id = a.channel_id 
            AND st.task_audit_status = 'approved'
        )
        OR 
        -- 条件2：账号的uid在old_accounts_fb表中存在相同uid的数据
        (a.uid IS NOT NULL AND EXISTS (
          SELECT 1 
          FROM old_accounts_fb oaf 
          WHERE oaf.uid = a.uid
        ))
      )
    `;
    
    const [updateResult] = await connection.query(updateSql);
    logger.info(`成功更新了 ${updateResult.affectedRows} 个账号为老账号状态`);
    
    // 5. 查询统计信息
    const [totalAccounts] = await connection.query('SELECT COUNT(*) as total FROM accounts');
    const [newAccounts] = await connection.query('SELECT COUNT(*) as count FROM accounts WHERE is_new = 1');
    const [oldAccounts] = await connection.query('SELECT COUNT(*) as count FROM accounts WHERE is_new = 0');
    
    logger.info(`迁移完成统计：`);
    logger.info(`- 总账号数: ${totalAccounts[0].total}`);
    logger.info(`- 新账号数: ${newAccounts[0].count}`);
    logger.info(`- 老账号数: ${oldAccounts[0].count}`);
    
    // 提交事务
    await connection.commit();
    logger.info('账号is_new字段迁移完成!');
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`迁移失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      logger.error(`迁移失败: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { migrate }; 
