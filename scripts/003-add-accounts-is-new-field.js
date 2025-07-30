/**
 * 数据库迁移脚本：为accounts表添加is_new字段并处理历史数据
 * 迁移规则：
 * - 如果 submitted_tasks 表中存在由该账号提交的任务，且该任务的任务审核状态（task_audit_status）为已通过（approved），则该账号为老账号
 * - submitted_tasks 表中的 member_id 对应 accounts 表中的 member_id
 * - submitted_tasks 表中的 task_id 对应 tasks 表中的 id
 * - tasks 表中的 channel_id 对应 accounts 表中的 channel_id
 */
const mysql = require('mysql2/promise');
const dbConfig = require('../src/shared/config/db.config');

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('开始执行账号is_new字段迁移...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 1. 首先检查is_new字段是否已存在
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'is_new'
    `, [dbConfig.database]);
    
    if (columns.length === 0) {
      // 2. 添加is_new字段（如果不存在）
      console.log('添加is_new字段到accounts表...');
      await connection.execute(`
        ALTER TABLE accounts 
        ADD COLUMN is_new tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否新账号：0-老账号，1-新账号'
        AFTER submit_time
      `);
      
      // 3. 添加索引
      console.log('为is_new字段添加索引...');
      await connection.execute(`
        ALTER TABLE accounts 
        ADD INDEX idx_is_new (is_new)
      `);
    } else {
      console.log('is_new字段已存在，跳过字段添加步骤');
    }
    
    // 4. 更新历史数据：将有已通过审核任务的账号标记为老账号
    console.log('更新历史数据：标记老账号...');
    const updateSql = `
      UPDATE accounts a 
      SET is_new = 0 
      WHERE EXISTS (
        SELECT 1 
        FROM submitted_tasks st 
        INNER JOIN tasks t ON st.task_id = t.id 
        WHERE st.member_id = a.member_id 
          AND t.channel_id = a.channel_id 
          AND st.task_audit_status = 'approved'
      )
    `;
    
    const [updateResult] = await connection.execute(updateSql);
    console.log(`成功更新了 ${updateResult.affectedRows} 个账号为老账号状态`);
    
    // 5. 查询统计信息
    const [totalAccounts] = await connection.execute('SELECT COUNT(*) as total FROM accounts');
    const [newAccounts] = await connection.execute('SELECT COUNT(*) as count FROM accounts WHERE is_new = 1');
    const [oldAccounts] = await connection.execute('SELECT COUNT(*) as count FROM accounts WHERE is_new = 0');
    
    console.log(`迁移完成统计：`);
    console.log(`- 总账号数: ${totalAccounts[0].total}`);
    console.log(`- 新账号数: ${newAccounts[0].count}`);
    console.log(`- 老账号数: ${oldAccounts[0].count}`);
    
    // 提交事务
    await connection.commit();
    console.log('账号is_new字段迁移完成!');
    
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error('迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

// 执行迁移
migrate()
  .then(() => {
    console.log('迁移脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  }); 