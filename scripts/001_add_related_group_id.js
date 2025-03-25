/**
 * 迁移脚本：添加related_group_id字段到bills表
 * 用于记录获得奖励的会员所属的群组ID，用于数据统计
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'skc'
  };
  
  console.log('开始执行迁移：添加related_group_id字段到bills表');
  
  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(connectionConfig);
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE 
        TABLE_SCHEMA = ?
        AND TABLE_NAME = 'bills'
        AND COLUMN_NAME = 'related_group_id'
    `, [connectionConfig.database]);
    
    // 如果字段已存在，则不需要添加
    if (columns.length > 0) {
      console.log('字段 related_group_id 已存在，无需添加');
    } else {
      // 添加字段
      await connection.query(`
        ALTER TABLE bills
        ADD COLUMN related_group_id bigint(20) DEFAULT NULL COMMENT '关联的群组ID' AFTER related_member_id,
        ADD KEY idx_related_group_id (related_group_id)
      `);
      console.log('成功添加 related_group_id 字段到bills表');
    }
    
    // 对已有账单数据进行处理，尝试填充related_group_id字段
    console.log('开始填充已有账单的related_group_id字段...');
    
    // 1. 处理任务奖励和群主收益相关的账单
    console.log('填充任务奖励和群主收益相关的账单...');
    const [submittedTasks] = await connection.query(`
      SELECT 
        st.task_id, st.member_id, st.related_group_id
      FROM submitted_tasks st
      WHERE st.related_group_id IS NOT NULL
    `);
    
    // 批量更新对应的账单
    for (const task of submittedTasks) {
      await connection.query(`
        UPDATE bills
        SET related_group_id = ?
        WHERE task_id = ? 
        AND member_id = ? 
        AND bill_type IN ('task_reward', 'group_owner_commission')
        AND related_group_id IS NULL
      `, [task.related_group_id, task.task_id, task.member_id]);
    }
    
    // 2. 处理邀请奖励相关的账单
    console.log('填充邀请奖励相关的账单...');
    const [inviteRewards] = await connection.query(`
      SELECT 
        b.id, b.task_id, b.related_member_id, st.related_group_id
      FROM bills b
      JOIN submitted_tasks st ON b.task_id = st.task_id AND b.related_member_id = st.member_id
      WHERE b.bill_type = 'invite_reward'
      AND st.related_group_id IS NOT NULL
      AND b.related_group_id IS NULL
    `);
    
    // 更新邀请奖励账单
    for (const reward of inviteRewards) {
      await connection.query(`
        UPDATE bills
        SET related_group_id = ?
        WHERE id = ?
      `, [reward.related_group_id, reward.id]);
    }
    
    console.log('迁移完成：related_group_id字段已添加并填充');
    return true;
  } catch (error) {
    console.error(`迁移失败: ${error.message}`);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行迁移
migrate()
  .then(success => {
    if (success) {
      console.log('迁移成功完成');
      process.exit(0);
    } else {
      console.error('迁移失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`执行迁移时发生错误: ${error.message}`);
    process.exit(1);
  }); 