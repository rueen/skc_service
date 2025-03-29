/**
 * 通知模型
 * 用于处理通知相关的数据库操作
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 格式化通知对象
 * @param {Object} notification - 通知数据
 * @returns {Object} - 格式化后的通知对象
 */
const formatNotification = (notification) => {
  if (!notification) return null;
  
  try {
    // 解析JSON内容
    const content = notification.content ? JSON.parse(notification.content) : {};
    
    return {
      id: notification.id,
      memberId: notification.member_id,
      type: notification.notification_type,
      title: notification.title,
      content: content,
      isRead: notification.is_read === 1,
      createdAt: notification.create_time,
      updatedAt: notification.update_time
    };
  } catch (error) {
    logger.error(`解析通知内容失败: ${error.message}`);
    return {
      id: notification.id,
      memberId: notification.member_id,
      type: notification.notification_type,
      title: notification.title,
      content: {},
      isRead: notification.is_read === 1,
      createdAt: notification.create_time,
      updatedAt: notification.update_time
    };
  }
};

/**
 * 创建通知
 * @param {Object} notificationData - 通知数据
 * @returns {Promise<Object>} - 创建的通知
 */
const create = async (notificationData) => {
  const connection = await pool.getConnection();
  try {
    const content = typeof notificationData.content === 'object' 
      ? JSON.stringify(notificationData.content) 
      : notificationData.content;
    
    const [result] = await connection.query(
      `INSERT INTO notifications 
      (member_id, notification_type, title, content, is_read, create_time, update_time) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        notificationData.memberId,
        notificationData.type,
        notificationData.title,
        content,
        notificationData.isRead ? 1 : 0
      ]
    );
    
    if (result.insertId) {
      const [rows] = await connection.query(
        'SELECT * FROM notifications WHERE id = ?',
        [result.insertId]
      );
      
      return formatNotification(rows[0]);
    }
    
    return null;
  } catch (error) {
    logger.error(`创建通知失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 获取用户未读通知列表
 * @param {string} memberId - 会员ID
 * @returns {Promise<Array>} - 通知列表
 */
const getUnreadByMemberId = async (memberId) => {
  const connection = await pool.getConnection();
  try {
    // 查询指定用户的未读通知和所有用户的未读通知（member_id = '*'）
    const [rows] = await connection.query(
      `SELECT * FROM notifications 
      WHERE (member_id = ? OR member_id = '*') AND is_read = 0 
      ORDER BY create_time DESC`,
      [memberId]
    );
    
    return rows.map(formatNotification);
  } catch (error) {
    logger.error(`获取用户未读通知失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 将通知标记为已读
 * @param {number} id - 通知ID
 * @param {string} memberId - 会员ID
 * @returns {Promise<boolean>} - 是否成功
 */
const markAsRead = async (id, memberId) => {
  const connection = await pool.getConnection();
  try {
    // 确保只有通知的接收者可以标记为已读
    const [result] = await connection.query(
      `UPDATE notifications SET is_read = 1, update_time = NOW() 
      WHERE id = ? AND (member_id = ? OR member_id = '*')`,
      [id, memberId]
    );
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error(`标记通知为已读失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 创建账号审核通过通知
 * @param {string} memberId - 会员ID
 * @param {string} account - 账号
 * @param {string} groupName - 群组名称
 * @param {string} groupLink - 群组链接
 * @returns {Promise<Object>} - 创建的通知
 */
const createAccountApprovedNotification = async (memberId, account, groupName, groupLink) => {
  return await create({
    memberId,
    type: 0, // 账号审核通过
    title: '账号审核通过通知',
    content: {
      account,
      groupName,
      groupLink
    },
    isRead: false
  });
};

/**
 * 创建账号审核拒绝通知
 * @param {string} memberId - 会员ID
 * @param {string} account - 账号
 * @param {string} rejectReason - 拒绝原因
 * @returns {Promise<Object>} - 创建的通知
 */
const createAccountRejectedNotification = async (memberId, account, rejectReason) => {
  return await create({
    memberId,
    type: 1, // 账号审核拒绝
    title: '账号审核拒绝通知',
    content: {
      account,
      rejectReason
    },
    isRead: false
  });
};

module.exports = {
  create,
  getUnreadByMemberId,
  markAsRead,
  createAccountApprovedNotification,
  createAccountRejectedNotification
}; 