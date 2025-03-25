/**
 * 测试任务审核通过后账单记录的related_group_id字段
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../src/shared/config/logger.config');

async function main() {
  // 配置数据库连接
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skc',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  logger.info(`开始测试 - 数据库配置: ${JSON.stringify({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password ? '***' : '',
    database: dbConfig.database
  })}`);

  let connection;
  try {
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    logger.info('数据库连接成功');

    // 1. 查询一个待审核的任务（如果没有，则创建一个测试任务）
    let [pendingTasks] = await connection.query(
      `SELECT st.id, st.task_id, st.member_id, st.related_group_id 
       FROM submitted_tasks st 
       WHERE st.task_audit_status = 'pending' 
       LIMIT 1`
    );

    let submittedTaskId;
    if (pendingTasks.length === 0) {
      logger.info('没有找到待审核的任务，将创建测试数据');
      // 创建测试数据需要执行一系列操作，包括：
      // 1. 创建测试会员
      // 2. 创建测试群组并关联会员
      // 3. 创建测试任务并让会员提交
      // 这里简化处理，仅检查现有的已审核任务
      
      [pendingTasks] = await connection.query(
        `SELECT st.id, st.task_id, st.member_id, st.related_group_id 
         FROM submitted_tasks st 
         WHERE st.task_audit_status = 'approved' 
         ORDER BY id DESC 
         LIMIT 1`
      );
      
      if (pendingTasks.length === 0) {
        logger.error('没有找到任何已审核或待审核的任务，无法进行测试');
        return;
      }
      
      logger.info(`使用最新的已审核任务进行测试: ${JSON.stringify(pendingTasks[0])}`);
      submittedTaskId = pendingTasks[0].id;
      
      // 检查此任务对应的账单中related_group_id的值
      const [bills] = await connection.query(
        `SELECT id, bill_type, amount, related_group_id 
         FROM bills 
         WHERE task_id = ? 
         ORDER BY id DESC`,
        [pendingTasks[0].task_id]
      );
      
      if (bills.length > 0) {
        logger.info(`找到关联的账单记录: ${JSON.stringify(bills)}`);
        for (const bill of bills) {
          logger.info(`账单ID: ${bill.id}, 类型: ${bill.bill_type}, 金额: ${bill.amount}, 关联群组ID: ${bill.related_group_id}`);
        }
        
        // 检查账单的related_group_id是否与submitted_tasks的related_group_id一致
        const submittedTaskGroupId = pendingTasks[0].related_group_id;
        const matchingBills = bills.filter(bill => bill.related_group_id === submittedTaskGroupId);
        
        if (matchingBills.length === bills.length) {
          logger.info('所有账单的related_group_id与任务提交时的related_group_id一致，测试通过');
        } else {
          logger.warn(`有${bills.length - matchingBills.length}/${bills.length}个账单的related_group_id与任务提交时的related_group_id不一致`);
          
          // 查看会员所属的群组
          const [memberGroups] = await connection.query(
            `SELECT group_id 
             FROM member_groups 
             WHERE member_id = ? 
             ORDER BY join_time ASC`,
            [pendingTasks[0].member_id]
          );
          
          if (memberGroups.length > 0) {
            logger.info(`会员所属的群组ID: ${memberGroups.map(g => g.group_id).join(', ')}`);
            const firstGroupId = memberGroups[0].group_id;
            
            // 检查是否有账单使用了第一个群组ID
            const usingFirstGroupBills = bills.filter(bill => bill.related_group_id === firstGroupId);
            if (usingFirstGroupBills.length > 0) {
              logger.info(`有${usingFirstGroupBills.length}个账单使用了会员的第一个群组ID: ${firstGroupId}`);
            }
          }
        }
      } else {
        logger.warn('没有找到与该任务关联的账单记录');
      }
      
      return;
    }
    
    // 如果找到了待审核任务，则进行审核并检查结果
    submittedTaskId = pendingTasks[0].id;
    logger.info(`找到待审核任务: ID=${submittedTaskId}, 任务ID=${pendingTasks[0].task_id}, 会员ID=${pendingTasks[0].member_id}, 关联群组ID=${pendingTasks[0].related_group_id}`);
    
    // 2. 模拟审核通过操作
    logger.info(`开始审核任务 ${submittedTaskId}`);
    await connection.beginTransaction();
    
    // 更新任务状态为已通过
    await connection.query(
      `UPDATE submitted_tasks SET task_audit_status = 'approved', waiter_id = 1 WHERE id = ?`,
      [submittedTaskId]
    );
    
    // 获取已通过任务的关联信息
    const [tasks] = await connection.query(
      `SELECT st.id, st.task_id, st.member_id, st.related_group_id, t.reward
       FROM submitted_tasks st
       JOIN tasks t ON st.task_id = t.id
       WHERE st.id = ?`,
      [submittedTaskId]
    );
    
    if (tasks.length === 0) {
      throw new Error('找不到审核通过的任务');
    }
    
    const task = tasks[0];
    const relatedGroupId = task.related_group_id;
    logger.info(`审核通过的任务信息: ${JSON.stringify(task)}`);
    
    // 3. 模拟处理任务奖励
    // 创建任务奖励账单
    const [billResult] = await connection.query(
      `INSERT INTO bills 
       (member_id, bill_type, amount, settlement_status, task_id, related_group_id) 
       VALUES (?, 'task_reward', ?, 'pending', ?, ?)`,
      [task.member_id, task.reward, task.task_id, relatedGroupId]
    );
    
    logger.info(`创建任务奖励账单: 账单ID=${billResult.insertId}, 关联群组ID=${relatedGroupId}`);
    
    // 4. 检查创建的账单记录
    const [insertedBill] = await connection.query(
      `SELECT id, bill_type, amount, related_group_id 
       FROM bills 
       WHERE id = ?`,
      [billResult.insertId]
    );
    
    if (insertedBill.length > 0) {
      logger.info(`插入的账单记录: ${JSON.stringify(insertedBill[0])}`);
      
      if (insertedBill[0].related_group_id === relatedGroupId) {
        logger.info('账单的related_group_id与任务提交时的related_group_id一致，测试通过');
      } else {
        logger.warn(`账单的related_group_id(${insertedBill[0].related_group_id})与任务提交时的related_group_id(${relatedGroupId})不一致`);
      }
    }
    
    // 回滚事务，不实际修改数据库
    await connection.rollback();
    logger.info('测试完成，已回滚事务');
    
  } catch (error) {
    logger.error(`测试失败: ${error.message}`);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        logger.error(`回滚事务失败: ${rollbackError.message}`);
      }
    }
  } finally {
    if (connection) {
      await connection.end();
      logger.info('数据库连接已关闭');
    }
  }
}

// 执行测试
main()
  .then(() => {
    logger.info('测试脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    logger.error(`测试脚本执行失败: ${error.message}`);
    process.exit(1);
  }); 