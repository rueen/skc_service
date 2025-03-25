/**
 * 迁移脚本：修复bills表中的related_group_id字段
 * 确保所有账单都正确关联到群组ID
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skc'
  };
  
  console.log('开始执行修复：修复bills表中的related_group_id字段');
  console.log('数据库配置:', connectionConfig);
  
  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(connectionConfig);
    
    // 1. 查询和修复任务奖励账单
    console.log('开始修复任务奖励账单...');
    const [taskRewards] = await connection.query(`
      SELECT 
        b.id, b.task_id, b.member_id, st.related_group_id
      FROM bills b
      JOIN submitted_tasks st ON b.task_id = st.task_id AND b.member_id = st.member_id
      WHERE b.bill_type = 'task_reward'
      AND st.related_group_id IS NOT NULL
      AND (b.related_group_id IS NULL OR b.related_group_id = 0)
    `);
    
    console.log(`找到 ${taskRewards.length} 条需要修复的任务奖励账单`);
    
    // 更新任务奖励账单
    let updatedTaskRewards = 0;
    for (const reward of taskRewards) {
      const [result] = await connection.query(`
        UPDATE bills
        SET related_group_id = ?
        WHERE id = ?
      `, [reward.related_group_id, reward.id]);
      
      if (result.affectedRows > 0) {
        updatedTaskRewards++;
      }
    }
    console.log(`成功修复 ${updatedTaskRewards} 条任务奖励账单`);
    
    // 2. 查询和修复群主收益账单
    console.log('开始修复群主收益账单...');
    const [ownerCommissions] = await connection.query(`
      SELECT 
        b.id, b.task_id, b.member_id, b.related_member_id, st.related_group_id
      FROM bills b
      JOIN submitted_tasks st ON b.task_id = st.task_id AND b.related_member_id = st.member_id
      WHERE b.bill_type = 'group_owner_commission'
      AND st.related_group_id IS NOT NULL
      AND (b.related_group_id IS NULL OR b.related_group_id = 0)
    `);
    
    console.log(`找到 ${ownerCommissions.length} 条需要修复的群主收益账单`);
    
    // 更新群主收益账单
    let updatedOwnerCommissions = 0;
    for (const commission of ownerCommissions) {
      const [result] = await connection.query(`
        UPDATE bills
        SET related_group_id = ?
        WHERE id = ?
      `, [commission.related_group_id, commission.id]);
      
      if (result.affectedRows > 0) {
        updatedOwnerCommissions++;
      }
    }
    console.log(`成功修复 ${updatedOwnerCommissions} 条群主收益账单`);
    
    // 3. 查询和修复邀请奖励账单
    console.log('开始修复邀请奖励账单...');
    const [inviteRewards] = await connection.query(`
      SELECT 
        b.id, b.task_id, b.related_member_id, st.related_group_id
      FROM bills b
      JOIN submitted_tasks st ON b.task_id = st.task_id AND b.related_member_id = st.member_id
      WHERE b.bill_type = 'invite_reward'
      AND st.related_group_id IS NOT NULL
      AND (b.related_group_id IS NULL OR b.related_group_id = 0)
    `);
    
    console.log(`找到 ${inviteRewards.length} 条需要修复的邀请奖励账单`);
    
    // 更新邀请奖励账单
    let updatedInviteRewards = 0;
    for (const reward of inviteRewards) {
      const [result] = await connection.query(`
        UPDATE bills
        SET related_group_id = ?
        WHERE id = ?
      `, [reward.related_group_id, reward.id]);
      
      if (result.affectedRows > 0) {
        updatedInviteRewards++;
      }
    }
    console.log(`成功修复 ${updatedInviteRewards} 条邀请奖励账单`);
    
    // 4. 修复其他没有关联群组ID的账单（使用会员的第一个群组ID）
    console.log('开始修复其他没有关联群组ID的账单...');
    const [otherBills] = await connection.query(`
      SELECT 
        b.id, b.member_id
      FROM bills b
      WHERE (b.related_group_id IS NULL OR b.related_group_id = 0)
    `);
    
    console.log(`找到 ${otherBills.length} 条需要修复的其他账单`);
    
    // 更新其他账单
    let updatedOtherBills = 0;
    for (const bill of otherBills) {
      // 查找会员的第一个群组
      const [groups] = await connection.query(`
        SELECT group_id
        FROM member_groups
        WHERE member_id = ?
        ORDER BY join_time ASC, id ASC
        LIMIT 1
      `, [bill.member_id]);
      
      if (groups.length > 0) {
        const [result] = await connection.query(`
          UPDATE bills
          SET related_group_id = ?
          WHERE id = ?
        `, [groups[0].group_id, bill.id]);
        
        if (result.affectedRows > 0) {
          updatedOtherBills++;
        }
      }
    }
    console.log(`成功修复 ${updatedOtherBills} 条其他账单`);
    
    console.log(`修复完成：共修复 ${updatedTaskRewards + updatedOwnerCommissions + updatedInviteRewards + updatedOtherBills} 条账单`);
    return true;
  } catch (error) {
    console.error(`修复失败: ${error.message}`);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行修复
migrate()
  .then(success => {
    if (success) {
      console.log('修复成功完成');
      process.exit(0);
    } else {
      console.error('修复失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`执行修复时发生错误: ${error.message}`);
    process.exit(1);
  }); 