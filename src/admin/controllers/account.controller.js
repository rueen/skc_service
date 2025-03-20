/**
 * 账号管理控制器
 * 处理管理端账号相关的业务逻辑
 */
const accountModel = require('../../shared/models/account.model');
const memberModel = require('../../shared/models/member.model');
const channelModel = require('../../shared/models/channel.model');
const { STATUS_CODES, MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');

/**
 * 获取账号列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAccounts(req, res) {
  try {
    const { page = 1, pageSize = 10, account, channelId, accountAuditStatus, groupId, memberId } = req.query;
    
    // 构建筛选条件
    const filters = {};
    
    if (account) {
      filters.account = account;
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
    
    // 调用模型获取账号列表
    const result = await accountModel.getList(filters, page, pageSize);
    
    // 扩展账号信息，添加会员所属群组和是否为群主的信息
    if (result.list && result.list.length > 0) {
      // 获取相关会员的群组信息
      const memberIds = [...new Set(result.list.map(account => account.memberId))].filter(Boolean);
      
      // 查询会员群组信息（仅当有会员ID时）
      const memberGroupMap = {};
      if (memberIds.length > 0) {
        const { pool } = require('../../shared/models/db');
        
        // 使用 member_groups 关联表查询
        const placeholders = memberIds.map(() => '?').join(',');
        const [memberGroups] = await pool.query(`
          SELECT mg.member_id, mg.group_id, g.group_name, mg.is_owner
          FROM member_groups mg
          JOIN \`groups\` g ON mg.group_id = g.id
          WHERE mg.member_id IN (${placeholders})
        `, memberIds);
        
        // 整理群组信息
        memberGroups.forEach(mg => {
          if (!memberGroupMap[mg.member_id]) {
            memberGroupMap[mg.member_id] = {
              groupId: mg.group_id,
              groupName: mg.group_name,
              isGroupOwner: Boolean(mg.is_owner)
            };
          }
        });
      }
      
      // 获取渠道的自定义字段（仅当有渠道ID时）
      const channelIds = [...new Set(result.list.map(account => account.channelId))].filter(Boolean);
      const channelMap = {};
      
      if (channelIds.length > 0) {
        const { pool } = require('../../shared/models/db');
        
        // 对每个渠道ID单独查询
        const channelPromises = channelIds.map(async (channelId) => {
          const [channels] = await pool.query(`
            SELECT id, name, custom_fields
            FROM channels
            WHERE id = ?
          `, [channelId]);
          
          return channels;
        });
        
        // 合并所有查询结果
        const channelsResults = await Promise.all(channelPromises);
        const channels = channelsResults.flat();
        
        channels.forEach(channel => {
          let channelCustomFields = [];
          if (channel.custom_fields) {
            try {
              // 如果已经是对象（MySQL 8可能返回解析好的JSON）
              if (typeof channel.custom_fields === 'object') {
                channelCustomFields = channel.custom_fields;
              } else if (typeof channel.custom_fields === 'string') {
                // 安全地解析JSON字符串
                channelCustomFields = JSON.parse(channel.custom_fields);
              }
            } catch (error) {
              logger.error(`解析渠道 ${channel.id} 自定义字段失败: ${error.message}`);
              // 解析失败时使用空数组
              channelCustomFields = [];
            }
          }
          
          channelMap[channel.id] = {
            channelName: channel.name,
            channelCustomFields: channelCustomFields
          };
        });
      }
      
      // 扩展账号信息
      result.list = result.list.map(account => {
        const groupInfo = memberGroupMap[account.memberId] || { groupName: '', isGroupOwner: false };
        const channelInfo = channelMap[account.channelId] || { channelName: '', channelCustomFields: [] };
        
        return {
          ...account,
          groupName: groupInfo.groupName,
          isGroupOwner: groupInfo.isGroupOwner,
          channelCustomFields: channelInfo.channelCustomFields
        };
      });
    }
    
    return responseUtil.success(res, {
      total: result.pagination.total,
      list: result.list,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    });
  } catch (error) {
    logger.error(`获取账号列表失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
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
        await pool.query(
          'UPDATE accounts SET account_audit_status = "approved", update_time = NOW() WHERE id = ?',
          [id]
        );
        results.success.push({
          id,
          memberId,
          groupId: memberGroupRows[0].group_id,
          groupName: memberGroupRows[0].group_name,
          message: '会员已有群组，审核通过'
        });
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
        results.failed.push({
          id,
          reason: '会员没有邀请人，无法自动分配群组'
        });
        continue;
      }
      
      // 获取邀请人的群组信息
      const [inviterGroupRows] = await pool.query(
        'SELECT mg.*, g.group_name, g.owner_id FROM member_groups mg JOIN `groups` g ON mg.group_id = g.id WHERE mg.member_id = ?',
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
        await pool.query(
          'UPDATE accounts SET account_audit_status = "approved", update_time = NOW() WHERE id = ?',
          [id]
        );
        
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
          `SELECT g.id, g.group_name, COUNT(mg.member_id) as member_count 
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
        await pool.query(
          'UPDATE accounts SET account_audit_status = "approved", update_time = NOW() WHERE id = ?',
          [id]
        );
        
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
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
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
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '账号ID列表不能为空');
    }
    
    // 执行批量拒绝操作
    const updatePromises = ids.map(id => {
      return accountModel.update({
        id,
        accountAuditStatus: 'rejected',
        rejectReason: rejectReason || '审核未通过'
      });
    });
    
    await Promise.all(updatePromises);
    
    return responseUtil.success(res, { success: true }, `成功拒绝 ${ids.length} 个账号`);
  } catch (error) {
    logger.error(`批量审核拒绝账号失败: ${error.message}`);
    return responseUtil.serverError(res, error.message || MESSAGES.SERVER_ERROR);
  }
}

module.exports = {
  getAccounts,
  batchResolve,
  batchReject
}; 