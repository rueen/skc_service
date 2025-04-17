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
    
    // 使用i18n键值作为消息
    return responseUtil.success(res, {
      total: result.pagination.total,
      list: result.list,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    }, 'account.list.success');
  } catch (error) {
    logger.error(`获取账号列表失败: ${error.message}`);
    return responseUtil.serverError(res, 'account.list.error');
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
      return responseUtil.badRequest(res, 'validator.account.ids');
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
      results
    }, 'account.batchResolve.success');
  } catch (error) {
    logger.error(`批量审核通过账号失败: ${error.message}`);
    return responseUtil.serverError(res, 'account.batchResolve.error');
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
      return responseUtil.badRequest(res, 'validator.account.ids');
    }
    
    if (!rejectReason) {
      return responseUtil.badRequest(res, 'validator.account.rejectReason');
    }
    
    // 处理批量拒绝
    await accountModel.batchReject(ids, rejectReason, waiterId);
    
    // 为每个账号创建通知
    for (const id of ids) {
      try {
        const [accountRows] = await accountModel.getById(id);
        if (accountRows && accountRows.length > 0) {
          const account = accountRows[0];
          const memberId = account.member_id;
          
          // 创建拒绝通知
          await notificationModel.createAccountRejectNotification(memberId, {
            accountId: id,
            account: account.account,
            reason: rejectReason
          });
        }
      } catch (notificationError) {
        logger.error(`创建拒绝通知失败: ${notificationError.message}`);
      }
    }
    
    return responseUtil.success(res, { count: ids.length }, 'account.batchReject.success');
  } catch (error) {
    logger.error(`批量拒绝账号失败: ${error.message}`);
    return responseUtil.serverError(res, 'account.batchReject.error');
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
      return responseUtil.badRequest(res, 'validator.common.required', { field: 'ID' });
    }

    const account = await accountModel.getById(id);
    
    if (!account) {
      return responseUtil.notFound(res, 'account.detail.notFound');
    }
    
    return responseUtil.success(res, account, 'account.detail.success');
  } catch (error) {
    logger.error(`获取账号详情失败: ${error.message}`);
    return responseUtil.serverError(res, 'account.detail.error');
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
    
    if (!id) {
      return responseUtil.badRequest(res, 'validator.common.required', { field: 'ID' });
    }
    
    // 检查账号是否存在
    const [existingAccount] = await accountModel.getById(id);
    
    if (!existingAccount || existingAccount.length === 0) {
      return responseUtil.notFound(res, 'account.detail.notFound');
    }
    
    // 构建更新数据
    const updateData = {};
    
    if (homeUrl !== undefined) updateData.homeUrl = homeUrl;
    if (uid !== undefined) updateData.uid = uid;
    if (account !== undefined) updateData.account = account;
    if (fansCount !== undefined) updateData.fansCount = parseInt(fansCount, 10);
    if (friendsCount !== undefined) updateData.friendsCount = parseInt(friendsCount, 10);
    if (postsCount !== undefined) updateData.postsCount = parseInt(postsCount, 10);
    
    // 执行更新
    await accountModel.update(id, updateData);
    
    // 获取更新后的账号信息
    const [updatedAccount] = await accountModel.getById(id);
    
    return responseUtil.success(res, updatedAccount[0], 'account.edit.success');
  } catch (error) {
    logger.error(`编辑账号失败: ${error.message}`);
    return responseUtil.serverError(res, 'account.edit.error');
  }
}

/**
 * 删除账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deleteAccount(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, 'validator.common.required', { field: 'ID' });
    }
    
    // 检查账号是否存在
    const [account] = await accountModel.getById(id);
    
    if (!account || account.length === 0) {
      return responseUtil.notFound(res, 'account.delete.notFound');
    }
    
    // 执行删除
    await accountModel.remove(id);
    
    return responseUtil.success(res, { id }, 'account.delete.success');
  } catch (error) {
    logger.error(`删除账号失败: ${error.message}`);
    return responseUtil.serverError(res, 'account.delete.error');
  }
}

module.exports = {
  getAccounts,
  batchResolve,
  batchReject,
  editAccount,
  getAccountDetail,
  deleteAccount
}; 