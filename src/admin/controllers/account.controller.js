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
        
        // 使用member_groups关联表查询
        const placeholders = memberIds.map(() => '?').join(',');
        const [memberGroups] = await pool.query(`
          SELECT mg.member_id, g.id as group_id, g.group_name, mg.is_owner
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
    
    // 执行批量通过操作
    const updatePromises = ids.map(id => {
      return accountModel.update({
        id,
        accountAuditStatus: 'approved'
      });
    });
    
    await Promise.all(updatePromises);
    
    return responseUtil.success(res, { success: true }, `成功审核通过 ${ids.length} 个账号`);
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