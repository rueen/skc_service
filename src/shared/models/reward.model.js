/**
 * 奖励模型
 * 处理各种奖励计算和分配逻辑
 */
const { pool } = require('./db');
const { logger } = require('../config/logger.config');
const systemConfigModel = require('./system.config.model');
const memberBalanceModel = require('./member-balance.model');
const { BillType, SettlementStatus } = require('../config/enums');
const billModel = require('./bill.model');

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
       WHERE mg.member_id = ?
       ORDER BY mg.join_time ASC, g.id ASC
       LIMIT 1`,  // 添加LIMIT 1确保只返回一条记录
      [memberId]
    );
    
    if (rows.length === 0) {
      logger.info(`会员ID ${memberId} 没有所属的群组`);
      return null;
    }
    
    // 记录原始数据库行数据，便于调试
    logger.info(`会员ID ${memberId} 的群组原始数据: ${JSON.stringify(rows[0])}`);
    
    // 将蛇形命名转换为驼峰命名
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
 * @param {number} [data.relatedGroupId] - 关联群组ID
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 处理结果
 */
async function processTaskReward(data, connection) {
  try {
    // 创建任务奖励账单
    const billResult = await billModel.createBill({
      memberId: data.memberId,
      billType: BillType.TASK_REWARD,
      amount: data.reward,
      taskId: data.taskId,
      relatedMemberId: data.memberId,
      relatedGroupId: data.relatedGroupId
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
 * @param {number} [data.relatedGroupId] - 关联群组ID
 * @param {Object} connection - 数据库连接（用于事务）
 * @returns {Promise<Object>} 处理结果
 */
async function processInviteReward(data, connection) {
  try {
    // 获取邀请奖励金额配置
    const inviteRewardAmount = await systemConfigModel.getInviteRewardAmount();
    
    // 创建邀请奖励账单
    const billResult = await billModel.createBill({
      memberId: data.inviterId,
      billType: BillType.INVITE_REWARD,
      amount: inviteRewardAmount,
      taskId: data.taskId,
      relatedMemberId: data.memberId,
      relatedGroupId: data.relatedGroupId
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
 * @param {number} [data.relatedGroupId] - 关联群组ID
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
    const billResult = await billModel.createBill({
      memberId: data.ownerId,
      billType: BillType.GROUP_OWNER_COMMISSION,
      amount: commissionAmount.toFixed(2),
      taskId: data.taskId,
      relatedMemberId: data.memberId,
      relatedGroupId: data.relatedGroupId
    }, connection);
    
    // 结算账单
    await processBillSettlement(billResult.id, connection);
    
    return { success: true, billId: billResult.id, amount: commissionAmount };
  } catch (error) {
    logger.error(`处理群主收益失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processBillSettlement,
  getMemberGroupInfo,
  getMemberInviter,
  processTaskReward,
  processInviteReward,
  processGroupOwnerCommission
}; 