/**
 * 邀请模型
 * 处理会员邀请相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');
const { formatDateTime } = require('../utils/date.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../config/api.config');
const { BillType } = require('../config/enums');

/**
 * 获取会员邀请数据统计
 * @param {number} memberId - 会员ID
 * @returns {Promise<Object>} 邀请统计数据
 */
async function getInviteStats(memberId) {
  try {
    // 获取邀请总人数
    const [inviteCountResult] = await pool.query(
      'SELECT COUNT(*) as inviteCount FROM members WHERE inviter_id = ?',
      [memberId]
    );
    
    // 获取累计邀请奖励
    const [totalRewardResult] = await pool.query(
      `SELECT SUM(amount) as totalReward 
       FROM bills 
       WHERE member_id = ? AND bill_type = ?`,
      [memberId, BillType.INVITE_REWARD]
    );
    
    return {
      inviteCount: inviteCountResult[0].inviteCount || 0,
      totalReward: parseFloat(totalRewardResult[0].totalReward || 0).toFixed(2)
    };
  } catch (error) {
    logger.error(`获取会员邀请数据统计失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取会员邀请好友列表
 * @param {number} memberId - 会员ID
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @returns {Promise<Object>} 邀请好友列表和统计信息
 */
async function getInviteFriends(memberId, options = {}) {
  const { 
    page = DEFAULT_PAGE, 
    pageSize = DEFAULT_PAGE_SIZE
  } = options;
  
  const offset = (page - 1) * pageSize;
  
  try {
    // 获取被邀请人总数
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM members WHERE inviter_id = ?',
      [memberId]
    );
    const total = countResult[0].total;
    
    if (total === 0) {
      return {
        total: 0,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        list: []
      };
    }
    
    // 获取被邀请人基本信息
    const [invitedMembers] = await pool.query(
      `SELECT 
        m.id, 
        m.nickname as nickname, 
        m.member_account as account,
        m.avatar,
        m.create_time as inviteTime
      FROM members m
      WHERE m.inviter_id = ?
      ORDER BY m.create_time DESC
      LIMIT ?, ?`,
      [memberId, offset, parseInt(pageSize, 10)]
    );
    
    // 如果没有被邀请人，返回空列表
    if (invitedMembers.length === 0) {
      return {
        total,
        page: parseInt(page, 10),
        pageSize: parseInt(pageSize, 10),
        list: []
      };
    }
    
    // 获取被邀请人ID列表
    const invitedMemberIds = invitedMembers.map(member => member.id);
    
    // 获取被邀请人首次完成任务的时间
    const [firstTaskCompletions] = await pool.query(
      `SELECT 
        st.member_id,
        MIN(st.submit_time) as firstTaskTime
      FROM submitted_tasks st
      WHERE st.member_id IN (?) AND st.task_audit_status = 'approved'
      GROUP BY st.member_id`,
      [invitedMemberIds]
    );
    
    // 创建首次任务完成时间映射
    const firstTaskTimeMap = {};
    firstTaskCompletions.forEach(item => {
      firstTaskTimeMap[item.member_id] = item.firstTaskTime;
    });
    
    // 获取邀请奖励信息
    const [inviteRewards] = await pool.query(
      `SELECT 
        related_member_id,
        amount
      FROM bills
      WHERE member_id = ? 
        AND bill_type = ? 
        AND related_member_id IN (?)
        AND settlement_status = 'success'`,
      [memberId, BillType.INVITE_REWARD, invitedMemberIds]
    );
    
    // 创建邀请奖励映射
    const inviteRewardMap = {};
    inviteRewards.forEach(item => {
      inviteRewardMap[item.related_member_id] = parseFloat(item.amount);
    });
    
    // 整合数据
    const formattedList = invitedMembers.map(member => ({
      id: member.id,
      nickname: member.nickname,
      account: member.account,
      avatar: member.avatar || '',
      inviteTime: formatDateTime(member.inviteTime),
      firstTaskTime: firstTaskTimeMap[member.id] ? formatDateTime(firstTaskTimeMap[member.id]) : null,
      inviteReward: inviteRewardMap[member.id] ? parseFloat(inviteRewardMap[member.id]).toFixed(2) : "0.00"
    }));
    
    return {
      total,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      list: formattedList
    };
  } catch (error) {
    logger.error(`获取会员邀请好友列表失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getInviteStats,
  getInviteFriends
}; 