/**
 * H5端会员账号控制器
 * 处理H5端会员账号相关的业务逻辑
 */
const accountModel = require('../../shared/models/account.model');
const oldAccountsFbModel = require('../../shared/models/old-accounts-fb.model');
const memberModel = require('../../shared/models/member.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取会员账号列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAccounts(req, res) {
  try {
    const memberId = req.user.id;
    
    // 获取会员账号列表
    const accounts = await accountModel.getByMemberId(memberId);
    
    return responseUtil.success(res, accounts);
  } catch (error) {
    logger.error(`获取会员账号列表失败: ${error.message}`);
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
    const memberId = req.user.id;
    const accountId = parseInt(req.params.id, 10);
    
    if (isNaN(accountId)) {
      return responseUtil.badRequest(res, '无效的账号ID');
    }
    
    // 只查询账号表，不关联渠道表
    const query = `
      SELECT a.*
      FROM accounts a
      WHERE a.id = ?
      LIMIT 1
    `;
    
    const { pool } = require('../../shared/models/db');
    const [rows] = await pool.query(query, [accountId]);
    
    if (rows.length === 0) {
      return responseUtil.notFound(res, i18n.t('h5.account.notFound', req.lang));
    }
    
    const account = rows[0];
    
    // 检查账号是否属于当前会员
    if (account.member_id !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.account.noPermissionView', req.lang));
    }
    
    return responseUtil.success(res, accountModel.formatAccount(account));
  } catch (error) {
    logger.error(`获取账号详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 添加会员账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function addAccount(req, res) {
  try {
    const memberId = req.user.id;
    const { channelId, account, uid, homeUrl, fansCount, friendsCount, postsCount } = req.body;
    
    // 1. 检查当前会员在该渠道是否已有未删除的账号
    const memberAccountInChannel = await accountModel.getByMemberAndChannel(memberId, channelId);
    if (memberAccountInChannel) {
      return responseUtil.badRequest(res, i18n.t('h5.account.alreadyExists', req.lang));
    }
    
    // 2. 检查要添加的账号（通过uid）是否已存在
    let existingAccountByUid = null;
    if (uid) {
      const { pool } = require('../../shared/models/db');
      const [rows] = await pool.query(
        'SELECT * FROM accounts WHERE uid = ? LIMIT 1',
        [uid]
      );
      if (rows.length > 0) {
        existingAccountByUid = accountModel.formatAccount(rows[0]);
      }
    }
    
    // 3. 如果uid对应的账号已存在且未删除，返回错误
    if (existingAccountByUid && existingAccountByUid.isDeleted === 0) {
      return responseUtil.badRequest(res, i18n.t('h5.account.duplicateBind', req.lang));
    }
    
    // 4. 如果uid对应的账号已存在且已删除，恢复该账号并更新member_id
    if (existingAccountByUid && existingAccountByUid.isDeleted === 1) {
      const { pool } = require('../../shared/models/db');
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        const updateData = {
          id: existingAccountByUid.id,
          memberId, // 更新member_id为当前会员
          channelId, // 更新channel_id为当前渠道
          account,
          uid,
          homeUrl,
          fansCount: fansCount || 0,
          friendsCount: friendsCount || 0,
          postsCount: postsCount || 0,
          accountAuditStatus: 'pending', // 重置审核状态
          isDeleted: 0, // 恢复账号
          submitTime: new Date()
        };
        
        await accountModel.update(updateData);
        logger.info(`恢复已删除账号并更新归属，账号ID: ${existingAccountByUid.id}，原会员ID: ${existingAccountByUid.memberId}，新会员ID: ${memberId}`);
        
        // 检查是否需要将会员标记为老会员
        // 条件：恢复的账号是老账号(is_new = 0) 且 当前会员是新会员(is_new = 1)
        if (existingAccountByUid.isNew === 0) {
          // 获取当前会员信息
          const member = await memberModel.getById(memberId);
          if (member && member.isNew === 1) {
            // 将会员标记为老会员
            const memberUpdated = await memberModel.updateIsNewStatus(memberId, connection);
            if (memberUpdated) {
              logger.info(`会员${memberId}因恢复老账号${existingAccountByUid.id}被标记为老会员`);
            }
          }
        }
        
        // 如果提供了uid，尝试关联FB老账号
        if (uid) {
          try {
            const bindResult = await oldAccountsFbModel.bindMember(uid, memberId);
            if (bindResult && bindResult.success && bindResult.associated) {
              // 如果成功关联了FB老账号，则更新该账号为老账号
              try {
                await accountModel.updateIsNewStatusByMemberAndChannel(memberId, channelId);
                logger.info(`会员${memberId}的渠道${channelId}账号已标记为老账号`);
              } catch (updateError) {
                logger.error(`更新账号is_new状态失败: ${updateError.message}`);
              }
            }
          } catch (bindError) {
            logger.error(`关联FB老账号失败，但不影响账号恢复: ${bindError.message}`);
          }
        }
        
        await connection.commit();
        
        // 获取恢复后的账号信息
        const restoredAccount = await accountModel.getById(existingAccountByUid.id);
        return responseUtil.success(res, restoredAccount, i18n.t('h5.account.addSuccess', req.lang));
        
      } catch (error) {
        await connection.rollback();
        logger.error(`恢复账号失败: ${error.message}`);
        throw error;
      } finally {
        connection.release();
      }
    }
    
    // 添加账号
    const accountData = {
      memberId,
      channelId,
      account,
      uid,
      homeUrl,
      fansCount: fansCount || 0,
      friendsCount: friendsCount || 0,
      postsCount: postsCount || 0,
      accountAuditStatus: 'pending'
    };
    
    const newAccount = await accountModel.create(accountData);
    
    // 如果提供了uid，尝试关联FB老账号
    if (uid) {
      try {
        const bindResult = await oldAccountsFbModel.bindMember(uid, memberId);
        if (bindResult && bindResult.success && bindResult.associated) {
          // 如果成功关联了FB老账号，则更新该账号为老账号
          try {
            await accountModel.updateIsNewStatusByMemberAndChannel(memberId, channelId);
            logger.info(`会员${memberId}的渠道${channelId}账号已标记为老账号`);
          } catch (updateError) {
            logger.error(`更新账号is_new状态失败: ${updateError.message}`);
          }
        }
      } catch (bindError) {
        logger.error(`关联FB老账号失败，但不影响账号创建: ${bindError.message}`);
        // 关联失败不影响账号创建的结果
      }
    }
    
    return responseUtil.success(res, newAccount, i18n.t('h5.account.addSuccess', req.lang));
  } catch (error) {
    logger.error(`添加会员账号失败: ${error.message}`);
    
    // 处理UID重复的特定错误
    if (error.message === '该账号已被使用，禁止重复绑定') {
      return responseUtil.badRequest(res, i18n.t('h5.account.duplicateBind', req.lang));
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 更新账号信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateAccount(req, res) {
  try {
    const memberId = req.user.id;
    const accountId = parseInt(req.params.id, 10);
    
    if (isNaN(accountId)) {
      return responseUtil.badRequest(res, '无效的账号ID');
    }
    
    // 获取要更新的字段
    const { account, uid, homeUrl, fansCount, friendsCount, postsCount } = req.body;
    
    // 获取账号详情，检查是否存在以及是否属于当前会员
    const accountInfo = await accountModel.getById(accountId);
    
    if (!accountInfo) {
      return responseUtil.notFound(res, i18n.t('h5.account.notFound', req.lang));
    }
    
    // 检查账号是否属于当前会员
    if (accountInfo.memberId !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.account.noPermissionUpdate', req.lang));
    }

    // 检查账号驳回次数限制
    const { pool } = require('../../shared/models/db');
    const [systemConfigRows] = await pool.query(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      ['account_reject_times']
    );
    
    const maxRejectTimes = systemConfigRows.length > 0 ? parseInt(systemConfigRows[0].config_value, 10) : -1;
    
    // 如果系统配置不为-1（不限制），则检查驳回次数
    if (maxRejectTimes !== -1) {
      const currentRejectTimes = accountInfo.rejectTimes || 0;
      if (currentRejectTimes > maxRejectTimes) {
        return responseUtil.badRequest(res, i18n.t('h5.account.rejectTimesLimit', req.lang));
      }
    }
    // 如果提供了新的uid，检查是否存在冲突
    if (uid && uid !== accountInfo.uid) {
      // 检查新uid对应的账号是否已存在
      const [existingUidRows] = await pool.query(
        'SELECT * FROM accounts WHERE uid = ? LIMIT 1',
        [uid]
      );
      
      if (existingUidRows.length > 0) {
        const existingAccountByUid = accountModel.formatAccount(existingUidRows[0]);
        
        // 如果uid对应的账号存在且未删除，返回错误
        if (existingAccountByUid.isDeleted === 0) {
          return responseUtil.badRequest(res, i18n.t('h5.account.duplicateBind', req.lang));
        }
        
        // 如果uid对应的账号存在且已删除，恢复该账号并更新归属
        if (existingAccountByUid.isDeleted === 1) {
          const connection = await pool.getConnection();
          
          try {
            await connection.beginTransaction();
            
            // 恢复已删除的账号并更新归属和信息
            const updateDataForRecovery = {
              id: existingAccountByUid.id,
              memberId, // 更新member_id为当前会员
              channelId: accountInfo.channelId, // 更新channel_id为当前渠道
              account,
              uid,
              homeUrl,
              fansCount: fansCount || 0,
              friendsCount: friendsCount || 0,
              postsCount: postsCount || 0,
              accountAuditStatus: 'pending', // 重置审核状态
              isDeleted: 0, // 恢复账号
              submitTime: new Date()
            };
            
            await accountModel.update(updateDataForRecovery);
            logger.info(`更新账号时恢复已删除账号并更新归属，账号ID: ${existingAccountByUid.id}，原会员ID: ${existingAccountByUid.memberId}，新会员ID: ${memberId}`);
            
            // 软删除当前账号
            await accountModel.update({
              id: accountId,
              isDeleted: 1
            });
            logger.info(`软删除原账号，账号ID: ${accountId}`);
            
            // 检查是否需要将会员标记为老会员
            // 条件：恢复的账号是老账号(is_new = 0) 且 当前会员是新会员(is_new = 1)
            if (existingAccountByUid.isNew === 0) {
              const member = await memberModel.getById(memberId);
              if (member && member.isNew === 1) {
                // 将会员标记为老会员
                const memberUpdated = await memberModel.updateIsNewStatus(memberId, connection);
                if (memberUpdated) {
                  logger.info(`会员${memberId}因恢复老账号${existingAccountByUid.id}被标记为老会员`);
                }
              }
            }
            
            // 如果提供了uid，尝试关联FB老账号
            if (uid) {
              try {
                const bindResult = await oldAccountsFbModel.bindMember(uid, memberId);
                if (bindResult && bindResult.success && bindResult.associated) {
                  // 如果成功关联了FB老账号，则更新该账号为老账号
                  try {
                    await accountModel.updateIsNewStatusByMemberAndChannel(memberId, accountInfo.channelId);
                    logger.info(`会员${memberId}的渠道${accountInfo.channelId}账号已标记为老账号`);
                  } catch (updateError) {
                    logger.error(`更新账号is_new状态失败: ${updateError.message}`);
                  }
                }
              } catch (bindError) {
                logger.error(`关联FB老账号失败，但不影响账号恢复: ${bindError.message}`);
              }
            }
            
            await connection.commit();
            
            // 获取恢复后的账号信息
            const restoredAccount = await accountModel.getById(existingAccountByUid.id);
            return responseUtil.success(res, { success: true }, i18n.t('h5.account.updateSuccess', req.lang));
            
          } catch (error) {
            await connection.rollback();
            logger.error(`恢复账号失败: ${error.message}`);
            throw error;
          } finally {
            connection.release();
          }
        }
      }
    }
    
    let accountAuditStatus = 'pending';  // 修改后重置为待审核状态
    if(accountInfo.accountAuditStatus === 'approved'){
      accountAuditStatus = 'approved';
    }
    // 准备更新数据
    const updateData = {
      id: accountId,
      account: account,
      uid: uid,
      homeUrl: homeUrl,
      fansCount: fansCount,
      friendsCount: friendsCount,
      postsCount: postsCount,
      accountAuditStatus: accountAuditStatus
    };
    
    // 调用模型的更新方法
    await accountModel.update(updateData);
    
    // 如果提供了uid，尝试关联FB老账号
    if (uid) {
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        const bindResult = await oldAccountsFbModel.bindMember(uid, memberId);
        if (bindResult && bindResult.success && bindResult.associated) {
          // 如果成功关联了FB老账号，则更新该账号为老账号
          try {
            await accountModel.updateIsNewStatusByMemberAndChannel(memberId, accountInfo.channelId);
            logger.info(`会员${memberId}的渠道${accountInfo.channelId}账号已标记为老账号`);
          } catch (updateError) {
            logger.error(`更新账号is_new状态失败: ${updateError.message}`);
          }
          
          // 检查是否需要将会员标记为老会员
          // 条件：成功关联FB老账号 且 当前会员是新会员(is_new = 1)
          const member = await memberModel.getById(memberId);
          if (member && member.isNew === 1) {
            // 将会员标记为老会员
            const memberUpdated = await memberModel.updateIsNewStatus(memberId, connection);
            if (memberUpdated) {
              logger.info(`会员${memberId}因关联FB老账号被标记为老会员`);
            }
          }
        }
        
        await connection.commit();
      } catch (bindError) {
        await connection.rollback();
        logger.error(`关联FB老账号失败，但不影响账号更新: ${bindError.message}`);
        // 关联失败不影响账号更新的结果
      } finally {
        connection.release();
      }
    }
    
    // 只返回成功消息，不再返回更新后的账号信息
    return responseUtil.success(res, { success: true }, i18n.t('h5.account.updateSuccess', req.lang));
  } catch (error) {
    logger.error(`更新账号失败: ${error.message}`);
    
    // 处理UID重复的特定错误
    if (error.message === '该账号已被使用，禁止重复绑定') {
      return responseUtil.badRequest(res, i18n.t('h5.account.duplicateBind', req.lang));
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 删除会员账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deleteAccount(req, res) {
  try {
    const memberId = req.user.id;
    const accountId = parseInt(req.params.id, 10);
    
    if (isNaN(accountId)) {
      return responseUtil.badRequest(res, '无效的账号ID');
    }
    
    // 获取账号详情，检查是否存在以及是否属于当前会员
    const accountInfo = await accountModel.getById(accountId);
    
    if (!accountInfo) {
      return responseUtil.notFound(res, i18n.t('h5.account.notFound', req.lang));
    }
    
    // 检查账号是否属于当前会员
    if (accountInfo.memberId !== memberId) {
      return responseUtil.forbidden(res, i18n.t('h5.account.noPermissionDelete', req.lang));
    }
    
    // 软删除账号（设置is_deleted为1）
    const result = await accountModel.update({
      id: accountId,
      isDeleted: 1
    });
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`删除账号失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 根据主页链接查找UID
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function findUidByHomeUrl(req, res) {
  try {
    const { homeUrl } = req.body;
    
    if (!homeUrl) {
      return responseUtil.badRequest(res, '主页链接不能为空');
    }
    
    // 获取UID
    const uid = await oldAccountsFbModel.getUidByHomeUrl(homeUrl);
    
    return responseUtil.success(res, { uid });
  } catch (error) {
    logger.error(`根据主页链接查找UID失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  getAccounts,
  getAccountDetail,
  addAccount,
  updateAccount,
  deleteAccount,
  findUidByHomeUrl
}; 