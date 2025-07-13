/**
 * 任务组奖励发放服务
 * 处理任务组奖励相关的业务逻辑
 */
const { pool } = require('../models/db');
const { logger } = require('../config/logger.config');
const { BillType } = require('../config/enums');
const { formatDateTime } = require('../utils/date.util');
const billModel = require('../models/bill.model');
const memberBalanceModel = require('../models/member-balance.model');

/**
 * 检查并发放任务组奖励
 * 当任务组中最后一个任务完成时，发放任务组奖励
 * @param {number} taskId - 刚刚审核通过的任务ID
 * @param {number} memberId - 会员ID
 * @returns {Promise<boolean>} 是否发放了奖励
 */
async function checkAndGrantTaskGroupReward(taskId, memberId) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 1. 检查任务是否属于任务组
    const [taskGroupRows] = await connection.query(
      'SELECT task_group_id FROM task_task_groups WHERE task_id = ?',
      [taskId]
    );
    
    if (taskGroupRows.length === 0) {
      // 任务不属于任务组，无需发放奖励
      await connection.commit();
      return false;
    }
    
    const taskGroupId = taskGroupRows[0].task_group_id;
    
    // 2. 获取任务组信息
    const [taskGroupInfo] = await connection.query(
      'SELECT task_group_name, task_group_reward, related_tasks FROM task_groups WHERE id = ?',
      [taskGroupId]
    );
    
    if (taskGroupInfo.length === 0) {
      logger.warn(`任务组不存在 - ID: ${taskGroupId}`);
      await connection.commit();
      return false;
    }
    
    const taskGroup = taskGroupInfo[0];
    const taskGroupReward = parseFloat(taskGroup.task_group_reward);
    
    // 如果任务组奖励金额为0或负数，不发放奖励
    if (taskGroupReward <= 0) {
      logger.info(`任务组奖励金额为0，不发放奖励 - 任务组ID: ${taskGroupId}`);
      await connection.commit();
      return false;
    }
    
    // 3. 解析任务组的related_tasks
    let relatedTasks = [];
    try {
      if (Array.isArray(taskGroup.related_tasks)) {
        relatedTasks = taskGroup.related_tasks;
      } else if (typeof taskGroup.related_tasks === 'string' && taskGroup.related_tasks.trim()) {
        relatedTasks = JSON.parse(taskGroup.related_tasks);
      }
    } catch (error) {
      logger.error(`解析任务组 ${taskGroupId} 的 related_tasks 失败: ${error.message}`);
      await connection.commit();
      return false;
    }
    
    if (relatedTasks.length === 0) {
      logger.info(`任务组 ${taskGroupId} 没有关联任务，不发放奖励`);
      await connection.commit();
      return false;
    }
    
    // 4. 检查当前任务是否是任务组中的最后一个任务
    const lastTaskId = relatedTasks[relatedTasks.length - 1];
    if (parseInt(taskId) !== parseInt(lastTaskId)) {
      // 不是最后一个任务，不发放奖励
      logger.debug(`任务 ${taskId} 不是任务组 ${taskGroupId} 的最后一个任务，不发放奖励`);
      await connection.commit();
      return false;
    }
    
    // 5. 检查用户是否已经获得过这个任务组的奖励
    const [existingReward] = await connection.query(
      'SELECT id, completion_status FROM enrolled_task_groups WHERE task_group_id = ? AND member_id = ?',
      [taskGroupId, memberId]
    );
    
    if (existingReward.length === 0) {
      logger.warn(`用户 ${memberId} 没有报名任务组 ${taskGroupId}，不发放奖励`);
      await connection.commit();
      return false;
    }
    
    if (existingReward[0].completion_status === 'completed') {
      logger.info(`用户 ${memberId} 已经获得过任务组 ${taskGroupId} 的奖励，不重复发放`);
      await connection.commit();
      return false;
    }
    
    // 6. 检查用户是否完成了任务组中的所有任务
    const placeholders = relatedTasks.map(() => '?').join(', ');
    const [completedTasks] = await connection.query(
      `SELECT task_id FROM submitted_tasks 
       WHERE member_id = ? AND task_id IN (${placeholders}) AND task_audit_status = 'approved'`,
      [memberId, ...relatedTasks]
    );
    
    const completedTaskIds = completedTasks.map(row => row.task_id);
    
    // 检查是否所有任务都已完成
    const allTasksCompleted = relatedTasks.every(taskId => completedTaskIds.includes(taskId));
    
    if (!allTasksCompleted) {
      logger.debug(`用户 ${memberId} 尚未完成任务组 ${taskGroupId} 中的所有任务，不发放奖励`);
      await connection.commit();
      return false;
    }
    
    // 7. 发放奖励
    const currentTime = new Date();
    
    // 7.1 创建账单记录
    const billData = {
      memberId,
      billType: BillType.TASK_GROUP_REWARD,
      amount: taskGroupReward,
      taskId: null,
      // remark: `完成任务组「${taskGroup.task_group_name}」奖励`,
      settlementStatus: 'success'
    };
    
    const billResult = await billModel.createBill(billData, connection);
    
    // 7.2 更新用户余额
    await memberBalanceModel.updateBalance(
      memberId,
      taskGroupReward,
      {
        transactionType: `完成任务组「${taskGroup.task_group_name}」奖励`,
        connection
      }
    );
    
    // 7.3 更新任务组完成状态
    await connection.query(
      `UPDATE enrolled_task_groups 
       SET completion_status = 'completed', completion_time = ?, reward_amount = ? 
       WHERE task_group_id = ? AND member_id = ?`,
      [currentTime, taskGroupReward, taskGroupId, memberId]
    );
    
    await connection.commit();
    
    logger.info(`任务组奖励发放成功 - 用户ID: ${memberId}, 任务组ID: ${taskGroupId}, 奖励金额: ${taskGroupReward}, 账单ID: ${billResult.id}`);
    
    return true;
    
  } catch (error) {
    await connection.rollback();
    logger.error(`检查并发放任务组奖励失败: ${error.message}`, {
      taskId,
      memberId,
      error: error.stack
    });
    return false;
  } finally {
    connection.release();
  }
}

module.exports = {
  checkAndGrantTaskGroupReward
}; 