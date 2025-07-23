/**
 * 账号管理控制器
 * 处理管理端账号相关的业务逻辑
 */
const accountModel = require('../../shared/models/account.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const notificationModel = require('../../shared/models/notification.model');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取账号列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {Object} 响应数据
 * @property {Array} list 账号列表
 * @property {Number} total 总数
 * @property {Number} page 当前页
 * @property {Number} pageSize 每页条数
 * @property {Number} list[].inviterId 邀请人ID
 * @property {String} list[].inviterNickname 邀请人昵称
 * @property {String} list[].inviterAccount 邀请人账号
 */
async function getAccounts(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      account, 
      keyword, 
      channelId, 
      accountAuditStatus, 
      groupId, 
      memberId,
      waiterId,
      submitStartTime,
      submitEndTime,
      sorterField,
      sorterOrder,
      inviter // 新增
    } = req.query;
    
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
    
    if (waiterId) {
      filters.waiterId = parseInt(waiterId, 10);
    }
    
    if (submitStartTime) {
      filters.submitStartTime = submitStartTime;
    }
    
    if (submitEndTime) {
      filters.submitEndTime = submitEndTime;
    }

    if (inviter) {
      filters.inviter = inviter;
    }
    
    // 构建排序选项
    const sortOptions = {};
    if (sorterField && sorterOrder) {
      sortOptions.field = sorterField;
      sortOptions.order = sorterOrder;
    }
    
    // 调用模型获取账号列表（包含群组和渠道详细信息）
    const result = await accountModel.getList(filters, page, pageSize, sortOptions);
    
    return responseUtil.success(res, {
      total: result.pagination.total,
      list: result.list,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    });
  } catch (error) {
    logger.error(`获取账号列表失败: ${error.message}`);
    return responseUtil.serverError(res);
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
          reason: i18n.t('admin.account.notFound', req.lang)
        });
        continue;
      }
      
      const account = accountRows[0];
      const memberId = account.member_id;
      
      if (!memberId) {
        results.failed.push({
          id,
          reason: i18n.t('admin.account.notAssociatedWithMember', req.lang)
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
        const result = await accountModel.batchApprove([id], waiterId);
        if(!result) {
          results.failed.push({
            id,
            reason: `${id} - ${i18n.t('admin.account.noPendingAccounts', req.lang)}`
          });
        } else {
          results.success.push({
            id,
            memberId,
            groupId: memberGroupRows[0].group_id,
            groupName: memberGroupRows[0].group_name,
            message: i18n.t('admin.account.alreadyInGroup', req.lang)
          });
        }
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
          reason: i18n.t('admin.account.memberNotFound', req.lang)
        });
        continue;
      }
      
      const inviterId = memberRows[0].inviter_id;
      
      if (!inviterId) {
        const nickname = memberRows[0].nickname;
        results.failed.push({
          id,
          reason: i18n.t('admin.account.noInviter', req.lang, {
            nickname
          })
        });
        continue;
      }
      
      // 获取邀请人的群组信息
      const [inviterGroupRows] = await pool.query(
        'SELECT mg.*, g.group_name, g.group_link, g.owner_id FROM member_groups mg JOIN `groups` g ON mg.group_id = g.id WHERE mg.member_id = ? ORDER BY mg.join_time ASC, g.id ASC LIMIT 1',
        [inviterId]
      );
      
      if (inviterGroupRows.length === 0) {
        results.failed.push({
          id,
          reason: i18n.t('admin.account.inviterNoGroup', req.lang)
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
        const result = await accountModel.batchApprove([id], waiterId);

        if(!result) {
          results.failed.push({
            id,
            reason: `${id} - ${i18n.t('admin.account.noPendingAccounts', req.lang)}`
          });
        } else {
          results.success.push({
            id,
            memberId,
            groupId: inviterGroup.group_id,
            groupName: inviterGroup.group_name,
            message: i18n.t('admin.account.assignedToInviterGroup', req.lang)
          });
        }
        
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
            reason: i18n.t('admin.account.inviterNoOwner', req.lang)
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
           ORDER BY member_count DESC`,
          [ownerId, maxGroupMembers]
        );
        
        if (ownerGroupsRows.length === 0) {
          results.failed.push({
            id,
            reason: i18n.t('admin.account.inviterAllGroupFull', req.lang)
          });
          continue;
        }
        
        // 分配到群主名下成员最多的未满群组
        const targetGroup = ownerGroupsRows[0];
        
        await pool.query(
          'INSERT INTO member_groups (member_id, group_id, is_owner) VALUES (?, ?, 0)',
          [memberId, targetGroup.id]
        );
        
        // 审核通过账号
        const result = await accountModel.batchApprove([id], waiterId);

        if(!result) {
          results.failed.push({
            id,
            reason: `${id} - ${i18n.t('admin.account.noPendingAccounts', req.lang)}`
          });
        } else {
          results.success.push({
            id,
            memberId,
            groupId: targetGroup.id,
            groupName: targetGroup.group_name,
            message: i18n.t('admin.account.assignedToOtherGroup', req.lang)
          });
        }
        
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
    }, i18n.t('admin.account.auditSuccess', req.lang, {
      success: results.success.length,
      failed: results.failed.length
    }));
  } catch (error) {
    logger.error(`批量审核通过账号失败: ${error.message}`);
    return responseUtil.serverError(res);
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

    if(!result) {
      return responseUtil.badRequest(res, '账号状态已变更，无法审核');
    }
    
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
    }, i18n.t('admin.account.rejectSuccess', req.lang, {
      count: result.updatedCount
    }));
  } catch (error) {
    logger.error(`批量审核拒绝账号失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('admin.account.notFound', req.lang));
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
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`编辑账号失败: ${error.message}`);
    
    // 处理唯一性验证错误
    if (error.message.includes('UID 已被使用') || error.message.includes('该账号已被使用，禁止重复绑定')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res);
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
      return responseUtil.notFound(res, i18n.t('admin.account.notFound', req.lang));
    }
    
    return responseUtil.success(res, account);
  } catch (error) {
    logger.error(`获取账号详情失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.badRequest(res, '账号ID不能为空');
    }
    
    // 检查账号是否存在
    const account = await accountModel.getById(parseInt(id, 10));
    
    if (!account) {
      return responseUtil.notFound(res, i18n.t('admin.account.notFound', req.lang));
    }
    
    // 删除账号
    const result = await accountModel.remove(parseInt(id, 10));
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`删除账号失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 导出账号列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportAccounts(req, res) {
  try {
    const { account, keyword, channelId, accountAuditStatus, groupId, memberId } = req.query;
    
    // 构建筛选条件
    const filters = {
      exportMode: true // 标记为导出模式，不使用分页
    };
    
    if (account) filters.account = account;
    if (keyword) filters.keyword = keyword;
    if (channelId) filters.channelId = parseInt(channelId, 10);
    if (accountAuditStatus) filters.accountAuditStatus = accountAuditStatus;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    if (memberId) filters.memberId = parseInt(memberId, 10);
    
    // 获取所有符合条件的账号
    const result = await accountModel.getList(filters);
    
    if (!result.list || result.list.length === 0) {
      return res.status(404).send('没有符合条件的账号数据');
    }
    
    // 创建Excel工作簿和工作表
    const Excel = require('exceljs');
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('账号列表');
    
    // 设置列定义和宽度
    worksheet.columns = [
      { header: '会员ID', key: 'memberNickname', width: 20 },
      { header: '会员账号', key: 'memberAccount', width: 20 },
      { header: '注册时间', key: 'memberCreatetime', width: 20 },
      { header: '所属群组', key: 'groupName', width: 20 },
    ];
    
    // 添加数据行
    result.list.forEach(item => {
      worksheet.addRow({
        memberNickname: item.memberNickname || '',
        memberAccount: item.memberAccount || '',
        memberCreatetime: item.memberCreateTime || '',
        groupName: item.groupName || '',
      });
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=accounts.xlsx');
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`导出账号列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

// 导出控制器方法
module.exports = {
  getAccounts,
  batchResolve,
  batchReject,
  editAccount,
  getAccountDetail,
  deleteAccount,
  exportAccounts
}; 