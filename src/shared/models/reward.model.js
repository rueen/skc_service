/**
 * 奖励模型
 * 处理各种奖励计算和分配逻辑
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const systemConfigModel = require('./system.config.model');
const memberBalanceModel = require('./member-balance.model');
const { BillType, SettlementStatus } = require('../config/enums');

/**
 * 创建账单记录
 * @param {Object} billData - 账单数据
 * @param {number} billData.memberId - 会员ID
 * @param {string} billData.billType - 账单类型
 * @param {number} billData.amount - 金额
 * @param {number} billData.taskId - 任务ID
 * @param {number} [billData.relatedMemberId] - 关联会员ID（如邀请关系）
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 创建结果
 */
async function createBill(billData, connection) {
  try {
    // 初始化为待结算状态
    const [result] = await connection.query(
      `INSERT INTO bills 
       (member_id, bill_type, amount, settlement_status, task_id, related_member_id) 
       VALUES (?, ?, ?, 'pending', ?, ?)`,
      [
        billData.memberId,
        billData.billType,
        billData.amount,
        billData.taskId,
        billData.relatedMemberId || null
      ]
    );
    
    return { id: result.insertId };
  } catch (error) {
    logger.error(`创建账单记录失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理结算
 * @param {number} billId - 账单ID
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 结算结果
 */
async function processBillSettlement(billId, connection) {
  try {
    // 获取账单信息
    const [bills] = await connection.query(
      'SELECT id, member_id, bill_type, amount, task_id, related_member_id FROM bills WHERE id = ?',
      [billId]
    );
    
    if (bills.length === 0) {
      throw new Error(`账单不存在: ${billId}`);
    }
    
    const bill = bills[0];
    
    try {
      // 更新会员余额
      await memberBalanceModel.updateBalance(
        bill.member_id,
        bill.amount,
        {
          transactionType: `${bill.bill_type}(任务ID: ${bill.task_id})`,
          connection
        }
      );
      
      // 更新账单状态为成功
      await connection.query(
        'UPDATE bills SET settlement_status = ? WHERE id = ?',
        [SettlementStatus.SUCCESS, billId]
      );
      
      return { success: true };
    } catch (error) {
      // 更新账单状态为失败，并记录失败原因
      await connection.query(
        'UPDATE bills SET settlement_status = ?, failure_reason = ? WHERE id = ?',
        [SettlementStatus.FAILED, error.message, billId]
      );
      
      logger.error(`结算账单失败: ${error.message}, 账单ID: ${billId}`);
      return { success: false, error: error.message };
    }
  } catch (error) {
    logger.error(`处理账单结算失败: ${error.message}`);
    throw error;
  }
}

/**
 * 检查会员是否首次完成任务
 * @param {number} memberId - 会员ID
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<boolean>} 是否首次完成
 */
async function isFirstTaskCompletion(memberId, connection) {
  try {
    const [rows] = await connection.query(
      `SELECT COUNT(*) as count FROM submitted_tasks 
       WHERE member_id = ? AND task_audit_status = 'approved'`,
      [memberId]
    );
    
    // 如果之前已经有通过的任务，则不是首次完成
    return rows[0].count <= 1; // 小于等于1是因为当前任务也被计算在内
  } catch (error) {
    logger.error(`检查会员是否首次完成任务失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员所属的群组信息
 * @param {number} memberId - 会员ID
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 群组信息
 */
async function getMemberGroupInfo(memberId, connection) {
  try {
    const [rows] = await connection.query(
      `SELECT 
        mg.group_id, 
        g.owner_id, 
        g.owner_id = mg.member_id as is_group_owner 
       FROM member_groups mg
       JOIN \`groups\` g ON mg.group_id = g.id
       WHERE mg.member_id = ?`,
      [memberId]
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    return {
      groupId: rows[0].group_id,
      ownerId: rows[0].owner_id,
      isGroupOwner: !!rows[0].is_group_owner
    };
  } catch (error) {
    logger.error(`获取会员所属群组信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员的邀请人信息
 * @param {number} memberId - 会员ID
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 邀请人信息
 */
async function getMemberInviter(memberId, connection) {
  try {
    const [rows] = await connection.query(
      'SELECT inviter_id FROM members WHERE id = ?',
      [memberId]
    );
    
    if (rows.length === 0 || !rows[0].inviter_id) {
      return null;
    }
    
    return { inviterId: rows[0].inviter_id };
  } catch (error) {
    logger.error(`获取会员邀请人信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理任务奖励
 * @param {Object} data - 任务数据
 * @param {number} data.submittedTaskId - 已提交任务ID
 * @param {number} data.taskId - 任务ID
 * @param {number} data.memberId - 会员ID
 * @param {number} data.reward - 奖励金额
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 处理结果
 */
async function processTaskReward(data, connection) {
  try {
    // 创建任务奖励账单
    const billResult = await createBill({
      memberId: data.memberId,
      billType: BillType.TASK_REWARD,
      amount: data.reward,
      taskId: data.taskId
    }, connection);
    
    // 结算账单
    await processBillSettlement(billResult.id, connection);
    
    return { success: true, billId: billResult.id };
  } catch (error) {
    logger.error(`处理任务奖励失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理邀请奖励
 * @param {Object} data - 邀请数据
 * @param {number} data.taskId - 任务ID
 * @param {number} data.memberId - 完成任务的会员ID
 * @param {number} data.inviterId - 邀请人ID
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 处理结果
 */
async function processInviteReward(data, connection) {
  try {
    // 获取邀请奖励金额配置
    const inviteRewardAmount = await systemConfigModel.getInviteRewardAmount();
    
    // 创建邀请奖励账单
    const billResult = await createBill({
      memberId: data.inviterId,
      billType: BillType.INVITE_REWARD,
      amount: inviteRewardAmount,
      taskId: data.taskId,
      relatedMemberId: data.memberId
    }, connection);
    
    // 结算账单
    await processBillSettlement(billResult.id, connection);
    
    return { success: true, billId: billResult.id, amount: inviteRewardAmount };
  } catch (error) {
    logger.error(`处理邀请奖励失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理群主收益
 * @param {Object} data - 群组数据
 * @param {number} data.taskId - 任务ID
 * @param {number} data.memberId - 完成任务的会员ID
 * @param {number} data.ownerId - 群主ID
 * @param {number} data.reward - 任务奖励金额
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 处理结果
 */
async function processGroupOwnerCommission(data, connection) {
  try {
    // 获取群主收益率配置
    const commissionRate = await systemConfigModel.getGroupOwnerCommissionRate();
    
    // 计算群主收益金额
    const commissionAmount = data.reward * commissionRate;
    
    // 创建群主收益账单
    const billResult = await createBill({
      memberId: data.ownerId,
      billType: BillType.GROUP_OWNER_COMMISSION,
      amount: commissionAmount.toFixed(2),
      taskId: data.taskId,
      relatedMemberId: data.memberId
    }, connection);
    
    // 结算账单
    await processBillSettlement(billResult.id, connection);
    
    return { success: true, billId: billResult.id, amount: commissionAmount };
  } catch (error) {
    logger.error(`处理群主收益失败: ${error.message}`);
    throw error;
  }
}

/**
 * 处理任务完成奖励
 * @param {number} submittedTaskId - 已提交任务ID
 * @returns {Promise<Object>} 处理结果
 */
async function processTaskCompletion(submittedTaskId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 获取提交任务的详细信息
    const [tasks] = await connection.query(
      `SELECT 
        st.id, st.task_id, st.member_id, t.reward
      FROM submitted_tasks st
      JOIN tasks t ON st.task_id = t.id
      WHERE st.id = ? AND st.task_audit_status = 'approved'`,
      [submittedTaskId]
    );
    
    if (tasks.length === 0) {
      throw new Error('找不到已通过审核的任务提交记录');
    }
    
    const task = tasks[0];
    const results = {
      taskReward: null,
      inviteReward: null,
      groupOwnerCommission: null
    };
    
    // 1. 处理任务奖励
    results.taskReward = await processTaskReward({
      submittedTaskId,
      taskId: task.task_id,
      memberId: task.member_id,
      reward: task.reward
    }, connection);
    
    // 2. 检查是否首次完成任务
    const isFirstCompletion = await isFirstTaskCompletion(task.member_id, connection);
    
    // 如果是首次完成，处理邀请奖励
    if (isFirstCompletion) {
      const inviterInfo = await getMemberInviter(task.member_id, connection);
      if (inviterInfo && inviterInfo.inviterId) {
        results.inviteReward = await processInviteReward({
          taskId: task.task_id,
          memberId: task.member_id,
          inviterId: inviterInfo.inviterId
        }, connection);
      }
    } 
    // 如果非首次完成，处理群主收益
    else {
      const groupInfo = await getMemberGroupInfo(task.member_id, connection);
      if (groupInfo && groupInfo.ownerId) {
        // 如果群主不是会员本人，则处理群主收益
        if (groupInfo.ownerId !== task.member_id) {
          results.groupOwnerCommission = await processGroupOwnerCommission({
            taskId: task.task_id,
            memberId: task.member_id,
            ownerId: groupInfo.ownerId,
            reward: task.reward
          }, connection);
        } 
        // 如果群主是会员本人，则也需要处理群主收益
        else {
          results.groupOwnerCommission = await processGroupOwnerCommission({
            taskId: task.task_id,
            memberId: task.member_id,
            ownerId: task.member_id,
            reward: task.reward
          }, connection);
        }
      }
    }
    
    await connection.commit();
    return { success: true, results };
  } catch (error) {
    await connection.rollback();
    logger.error(`处理任务完成奖励失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  processTaskCompletion,
  createBill,
  processBillSettlement,
  isFirstTaskCompletion,
  getMemberGroupInfo,
  getMemberInviter,
  processTaskReward,
  processInviteReward,
  processGroupOwnerCommission
}; 