/**
 * 账号管理控制器
 * 处理管理端账号相关的业务逻辑
 */
const accountModel = require('../../shared/models/account.model');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const notificationModel = require('../../shared/models/notification.model');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');

/**
 * 获取账号列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAccounts(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, account, keyword, channelId, accountAuditStatus, groupId, memberId } = req.query;
    
    // 构建筛选条件
    const filters = {};
    
    if (account) {
      filters.account = account;
    }
    
    if (keyword) {
      filters.keyword = keyword;
    }
    
    if (channelId) {
      filters.channelId = parseInt(channelId, 10);
    }
    
    if (accountAuditStatus) {
      filters.accountAuditStatus = accountAuditStatus;
    }
    
    if (groupId) {
      filters.groupId = parseInt(groupId, 10);
    }
    
    if (memberId) {
      filters.memberId = parseInt(memberId, 10);
    }
    
    // 调用模型获取账号列表（包含群组和渠道详细信息）
    const result = await accountModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, {
      total: result.pagination.total,
      list: result.list,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    });
  } catch (error) {
    logger.error(`获取账号列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取账号列表失败');
  }
}

/**
 * 批量审核通过账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchResolve(req, res) {
  try {
    const { ids } = req.body;
    const waiterId = req.user.id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '账号ID列表不能为空');
    }
    
    // 获取系统配置的群组最大成员数
    const { pool } = require('../../shared/models/db');
    const [maxMembersConfigRow] = await pool.query(
      'SELECT config_value FROM system_config WHERE config_key = "max_group_members"'
    );
    const maxGroupMembers = maxMembersConfigRow.length > 0 ? parseInt(maxMembersConfigRow[0].config_value, 10) : 200;
    
    // 审核结果记录
    const results = {
      success: [],
      failed: []
    };
    
    // 逐个审核账号
    for (const id of ids) {
      // 获取账号信息
      const [accountRows] = await pool.query(
        'SELECT * FROM accounts WHERE id = ?',
        [id]
      );
      
      if (accountRows.length === 0) {
        results.failed.push({
          id,
          reason: '账号不存在'
        });
        continue;
      }
      
      const account = accountRows[0];
      const memberId = account.member_id;
      
      if (!memberId) {
        results.failed.push({
          id,
          reason: '账号未关联会员'
        });
        continue;
      }
      
      // 检查会员是否已有群组
      const [memberGroupRows] = await pool.query(
        'SELECT mg.*, g.group_name FROM member_groups mg JOIN `groups` g ON mg.group_id = g.id WHERE mg.member_id = ?',
        [memberId]
      );
      
      if (memberGroupRows.length > 0) {
        // 会员已有群组，直接审核通过
        await accountModel.batchApprove([id], waiterId);
        results.success.push({
          id,
          memberId,
          groupId: memberGroupRows[0].group_id,
          groupName: memberGroupRows[0].group_name,
          message: '会员已有群组，审核通过'
        });
        // 会员已有群组，不触发通知
        continue;
      }
      
      // 获取会员的邀请人信息
      const [memberRows] = await pool.query(
        'SELECT * FROM members WHERE id = ?',
        [memberId]
      );
      
      if (memberRows.length === 0) {
        results.failed.push({
          id,
          reason: '会员不存在'
        });
        continue;
      }
      
      const inviterId = memberRows[0].inviter_id;
      
      if (!inviterId) {
        const nickname = memberRows[0].nickname;
        results.failed.push({
          id,
          reason: `会员【${nickname}】没有邀请人，无法自动分配群组`
        });
        continue;
      }
      
      // 获取邀请人的群组信息
      const [inviterGroupRows] = await pool.query(
        'SELECT mg.*, g.group_name, g.group_link, g.owner_id FROM member_groups mg JOIN `groups` g ON mg.group_id = g.id WHERE mg.member_id = ?',
        [inviterId]
      );
      
      if (inviterGroupRows.length === 0) {
        results.failed.push({
          id,
          reason: '邀请人没有所属群，无法自动分配群组'
        });
        continue;
      }
      
      // 首先尝试分配到邀请人的群组
      const inviterGroup = inviterGroupRows[0];
      
      // 检查邀请人的群组是否已满
      const [groupMemberCountRows] = await pool.query(
        'SELECT COUNT(*) as count FROM member_groups WHERE group_id = ?',
        [inviterGroup.group_id]
      );
      
      const currentGroupMemberCount = groupMemberCountRows[0].count;
      
      if (currentGroupMemberCount < maxGroupMembers) {
        // 邀请人的群组未满，直接分配
        await pool.query(
          'INSERT INTO member_groups (member_id, group_id, is_owner) VALUES (?, ?, 0)',
          [memberId, inviterGroup.group_id]
        );
        
        // 审核通过账号
        await accountModel.batchApprove([id], waiterId);
        
        // 更新群组成员计数
        await pool.query(
          'UPDATE `groups` SET member_count = ? WHERE id = ?',
          [currentGroupMemberCount + 1, inviterGroup.group_id]
        );
        
        results.success.push({
          id,
          memberId,
          groupId: inviterGroup.group_id,
          groupName: inviterGroup.group_name,
          message: '分配到邀请人的群组'
        });
        
        // 发送账号审核通过通知
        try {
          await notificationModel.createAccountApprovedNotification(
            memberId, 
            account.account, 
            inviterGroup.group_name, 
            inviterGroup.group_link || ''
          );
        } catch (notificationError) {
          logger.error(`发送账号审核通过通知失败: ${notificationError.message}`);
        }
      } else {
        // 邀请人的群组已满，查找该群主名下的其他未满群组
        const ownerId = inviterGroup.owner_id;
        
        if (!ownerId) {
          results.failed.push({
            id,
            reason: '邀请人所在群组已满且没有群主'
          });
          continue;
        }
        
        // 查找群主名下的其他未满群组
        const [ownerGroupsRows] = await pool.query(
          `SELECT g.id, g.group_name, g.group_link, COUNT(mg.member_id) as member_count 
           FROM \`groups\` g 
           LEFT JOIN member_groups mg ON g.id = mg.group_id 
           WHERE g.owner_id = ? 
           GROUP BY g.id 
           HAVING member_count < ?
           ORDER BY member_count ASC`,
          [ownerId, maxGroupMembers]
        );
        
        if (ownerGroupsRows.length === 0) {
          results.failed.push({
            id,
            reason: '邀请人所在群组已满，且该群主名下所有群组均已满员'
          });
          continue;
        }
        
        // 分配到群主名下成员最少的未满群组
        const targetGroup = ownerGroupsRows[0];
        
        await pool.query(
          'INSERT INTO member_groups (member_id, group_id, is_owner) VALUES (?, ?, 0)',
          [memberId, targetGroup.id]
        );
        
        // 审核通过账号
        await accountModel.batchApprove([id], waiterId);
        
        // 更新群组成员计数
        await pool.query(
          'UPDATE `groups` SET member_count = ? WHERE id = ?',
          [targetGroup.member_count + 1, targetGroup.id]
        );
        
        results.success.push({
          id,
          memberId,
          groupId: targetGroup.id,
          groupName: targetGroup.group_name,
          message: '邀请人所在群组已满，分配到群主名下的其他群组'
        });
        
        // 发送账号审核通过通知
        try {
          await notificationModel.createAccountApprovedNotification(
            memberId, 
            account.account, 
            targetGroup.group_name, 
            targetGroup.group_link || ''
          );
        } catch (notificationError) {
          logger.error(`发送账号审核通过通知失败: ${notificationError.message}`);
        }
      }
    }
    
    return responseUtil.success(res, {
      success: results.success,
      failed: results.failed,
      successCount: results.success.length,
      failedCount: results.failed.length
    }, `成功审核通过 ${results.success.length} 个账号，${results.failed.length} 个账号审核失败`);
  } catch (error) {
    logger.error(`批量审核通过账号失败: ${error.message}`);
    return responseUtil.serverError(res, '批量审核通过账号失败');
  }
}

/**
 * 批量审核拒绝账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchReject(req, res) {
  try {
    const { ids, rejectReason } = req.body;
    const waiterId = req.user.id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '账号ID列表不能为空');
    }
    
    // 获取账号详情，包含会员ID和账号信息
    const { pool } = require('../../shared/models/db');
    const [accountsInfo] = await pool.query(
      'SELECT id, member_id, account FROM accounts WHERE id IN (?)',
      [ids]
    );
    
    // 执行批量拒绝操作
    const result = await accountModel.batchReject(ids, rejectReason || '审核未通过', waiterId);
    
    // 发送账号审核拒绝通知
    const notificationPromises = accountsInfo.map(accountInfo => {
      return notificationModel.createAccountRejectedNotification(
        accountInfo.member_id,
        accountInfo.account,
        rejectReason || '审核未通过'
      ).catch(error => {
        logger.error(`发送账号审核拒绝通知失败: ${error.message}`);
      });
    });
    
    await Promise.all(notificationPromises);
    
    return responseUtil.success(res, { 
      success: true,
      updatedCount: result.updatedCount 
    }, `成功拒绝 ${result.updatedCount} 个账号`);
  } catch (error) {
    logger.error(`批量审核拒绝账号失败: ${error.message}`);
    return responseUtil.serverError(res, '批量审核拒绝账号失败');
  }
}

/**
 * 编辑账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function editAccount(req, res) {
  try {
    const { id } = req.params;
    const { homeUrl, uid, account, fansCount, friendsCount, postsCount } = req.body;
    
    // 检查账号是否存在
    const { pool } = require('../../shared/models/db');
    const [accountRows] = await pool.query('SELECT * FROM accounts WHERE id = ?', [id]);
    
    if (accountRows.length === 0) {
      return responseUtil.notFound(res, '账号不存在');
    }
    
    // 准备更新数据
    const accountData = {
      id: parseInt(id, 10)
    };
    
    // 仅包含提交的字段，未提交的字段不更新
    if (homeUrl !== undefined) accountData.homeUrl = homeUrl;
    if (uid !== undefined) accountData.uid = uid;
    if (account !== undefined) accountData.account = account;
    if (fansCount !== undefined) accountData.fansCount = parseInt(fansCount, 10);
    if (friendsCount !== undefined) accountData.friendsCount = parseInt(friendsCount, 10);
    if (postsCount !== undefined) accountData.postsCount = parseInt(postsCount, 10);
    
    // 调用模型更新账号信息
    const result = await accountModel.update(accountData);
    
    return responseUtil.success(res, result, '账号更新成功');
  } catch (error) {
    logger.error(`编辑账号失败: ${error.message}`);
    
    // 处理唯一性验证错误
    if (error.message.includes('UID 已被使用')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '编辑账号失败，请稍后重试');
  }
}

/**
 * 获取账号详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAccountDetail(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '账号ID不能为空');
    }
    
    // 获取账号详情
    const account = await accountModel.getById(parseInt(id, 10));
    
    if (!account) {
      return responseUtil.notFound(res, '账号不存在');
    }
    
    return responseUtil.success(res, account);
  } catch (error) {
    logger.error(`获取账号详情失败: ${error.message}`);
    return responseUtil.serverError(res, '获取账号详情失败');
  }
}

module.exports = {
  getAccounts,
  batchResolve,
  batchReject,
  editAccount,
  getAccountDetail
}; 