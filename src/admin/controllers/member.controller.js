/**
 * 会员控制器
 * 处理会员相关的业务逻辑
 */
const memberModel = require('../../shared/models/member.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const { OccupationType } = require('../../shared/config/enums');
const groupModel = require('../../shared/models/group.model');
const inviteModel = require('../../shared/models/invite.model');
const taskStatsModel = require('../../shared/models/task-stats.model');
const memberBalanceModel = require('../../shared/models/member-balance.model');
const withdrawalAccountModel = require('../../shared/models/withdrawal-account.model');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取会员列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function list(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, memberNickname, groupId } = req.query;
    const filters = {};
    
    if (memberNickname) filters.memberNickname = memberNickname;
    if (groupId) filters.groupId = parseInt(groupId, 10);

    // 获取带有账号信息的会员列表
    const result = await memberModel.getList(filters, page, pageSize);
    
    // 确保返回结果包含 accountList 字段
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取会员列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取会员详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getDetail(req, res) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return responseUtil.badRequest(res, '会员ID不能为空');
    }
    
    const member = await memberModel.getById(parseInt(id, 10));
    
    if (!member) {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    }

    return responseUtil.success(res, member);
  } catch (error) {
    logger.error(`获取会员详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 创建会员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function create(req, res) {
  try {
    const { 
      memberNickname, memberAccount, password, groupIds, inviterId, 
      occupation, phone, email, avatar, gender, telegram 
    } = req.body;

    // 参数验证
    if (!memberAccount || !password) {
      return responseUtil.badRequest(res, '会员账号和密码为必填项');
    }

    // 验证密码强度
    const validatorUtil = require('../../shared/utils/validator.util');
    if (!validatorUtil.isStrongPassword(password)) {
      return responseUtil.badRequest(res, i18n.t('admin.member.passwordInvalid', req.lang));
    }

    // 如果指定了群组，检查群组成员数是否达到上限
    if (groupIds && groupIds.length > 0) {
      // 检查每个群组是否存在
      for (const groupId of groupIds) {
        const parsedGroupId = parseInt(groupId, 10);
        // 检查群组是否存在
        const groupExists = await memberModel.checkGroupExists(parsedGroupId);
        if (!groupExists) {
          return responseUtil.badRequest(res, i18n.t('admin.member.groupByIdNotFound', req.lang, {
            parsedGroupId
          }));
        }
        
        // 检查群组成员数是否达到上限
        const groupLimit = await groupModel.checkGroupLimit(parsedGroupId);
        if (groupLimit.isFull) {
          return responseUtil.badRequest(res, i18n.t('admin.group.groupLimit', req.lang, {
            parsedGroupId,
            maxMembers: groupLimit.maxMembers
          }));
        }
      }
    }

    // 处理密码哈希
    const { hashPassword } = require('../../shared/utils/auth.util');
    const hashedPassword = await hashPassword(password);

    // 自动检测账号类型
    let loginType = 'account'; // 默认账号类型
    let actualEmail = email;
    let actualPhone = phone;

    // 根据账号格式判断类型
    if (validatorUtil.isValidEmail(memberAccount)) {
      loginType = 'email';
      actualEmail = memberAccount;
    } else if (validatorUtil.isValidPhone(memberAccount)) {
      loginType = 'phone';
      actualPhone = memberAccount;
    }

    // 生成默认昵称（如果没有提供）
    const actualNickname = memberNickname || `user${Math.floor(Math.random() * 1000000)}`;

    // 设置默认头像
    const defaultAvatar = 'http://skc-statics.oss-ap-southeast-6.aliyuncs.com/skc/defaultAvatar.png';
    const actualAvatar = avatar || defaultAvatar;

    const result = await memberModel.create({
      memberNickname: actualNickname,
      memberAccount,
      password: hashedPassword,
      groupIds: groupIds || [], // 传递群组ID数组
      inviterId: inviterId ? parseInt(inviterId, 10) : null,
      occupation,
      phone: actualPhone,
      email: actualEmail,
      avatar: actualAvatar,
      gender: gender !== undefined ? Number(gender) : 2, // 默认为保密
      telegram,
      registerSource: 'admin' // 标识为管理端添加
    });

    return responseUtil.success(res, result);
  } catch (error) {
    if (error.message === '会员账号已存在') {
      return responseUtil.badRequest(res, i18n.t('admin.member.accountExists', req.lang));
    } else if (error.message.includes('群组不存在')) {
      return responseUtil.badRequest(res, i18n.t('admin.member.groupNotFound', req.lang));
    } else if (error.message === '邀请人不存在') {
      return responseUtil.badRequest(res, i18n.t('admin.member.inviterNotFound', req.lang));
    }
    logger.error(`创建会员失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 更新会员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { 
      memberNickname, memberAccount, password, groupIds, inviterId, isNew
    } = req.body;
    
    // 如果要更新群组ID，检查群组成员数是否达到上限
    if (groupIds !== undefined) {
      // 获取会员当前所在群组
      const currentMember = await memberModel.getById(parseInt(id, 10));
      if (!currentMember) {
        return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
      }
      
      // 获取当前会员所在的群组ID列表
      const currentGroupIds = currentMember.groups.map(group => group.groupId);
      
      // 检查每个新群组
      if (groupIds && groupIds.length > 0) {
        for (const groupId of groupIds) {
          const parsedGroupId = parseInt(groupId, 10);
          
          // 检查群组是否存在
          const groupExists = await memberModel.checkGroupExists(parsedGroupId);
          if (!groupExists) {
            return responseUtil.badRequest(res, i18n.t('admin.member.groupByIdNotFound', req.lang, {
              parsedGroupId
            }));
          }
          
          // 如果是新的群组（不在当前群组列表中），才检查成员数量限制
          if (!currentGroupIds.includes(parsedGroupId)) {
            // 检查群组成员数是否达到上限
            const groupLimit = await groupModel.checkGroupLimit(parsedGroupId);
            if (groupLimit.isFull) {
              return responseUtil.badRequest(res, i18n.t('admin.group.groupLimit', req.lang, {
                parsedGroupId,
                maxMembers: groupLimit.maxMembers
              }));
            }
          }
        }
      }
    }

    // 处理密码哈希
    let hashedPassword;
    if (password) {
      const { hashPassword } = require('../../shared/utils/auth.util');
      hashedPassword = await hashPassword(password);
    }

    const result = await memberModel.update({
      id: parseInt(id, 10),
      memberNickname,
      memberAccount,
      password: password !== undefined ? hashedPassword : undefined,
      groupIds: groupIds !== undefined ? groupIds : undefined, // 传递群组ID数组
      inviterId: inviterId !== undefined ? (inviterId ? parseInt(inviterId, 10) : null) : undefined,
      isNew: isNew !== undefined ? Number(isNew) : undefined
    });

    if (!result) {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    }

    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === '会员不存在') {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    }
    if (error.message === '会员账号已被其他会员使用') {
      return responseUtil.badRequest(res, i18n.t('admin.member.accountUsed', req.lang));
    }
    if (error.message.includes('群组不存在')) {
      return responseUtil.badRequest(res, i18n.t('admin.member.groupNotFound', req.lang));
    }
    if (error.message === '邀请人不存在') {
      return responseUtil.badRequest(res, i18n.t('admin.member.inviterNotFound', req.lang));
    }
    logger.error(`更新会员失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 删除会员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return responseUtil.badRequest(res, '会员ID不能为空');
    }

    const result = await memberModel.remove(parseInt(id, 10));

    if (!result) {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    }

    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === '会员不存在') {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    }
    if (error.message === '该会员下存在关联账号，无法删除') {
      return responseUtil.badRequest(res, i18n.t('admin.member.associatedAccount', req.lang));
    }
    if (error.message === '该会员下存在关联任务，无法删除') {
      return responseUtil.badRequest(res, i18n.t('admin.member.associatedTask', req.lang));
    }
    if (error.message === '该会员下存在关联账单，无法删除') {
      return responseUtil.badRequest(res, i18n.t('admin.member.associatedBill', req.lang));
    }
    logger.error(`删除会员失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取会员邀请数据统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getInviteStats(req, res) {
  try {
    const { memberId } = req.params;
    
    if (!memberId) {
      return responseUtil.badRequest(res, '会员ID不能为空');
    }
    
    const member = await memberModel.getById(parseInt(memberId, 10));
    
    if (!member) {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    }

    const inviteStats = await inviteModel.getInviteStats(parseInt(memberId, 10));
    
    return responseUtil.success(res, inviteStats);
  } catch (error) {
    logger.error(`获取会员邀请数据统计失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取会员任务数据统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getTaskStats(req, res) {
  try {
    const { memberId } = req.params;
    
    if (!memberId) {
      return responseUtil.badRequest(res, '会员ID不能为空');
    }
    
    const member = await memberModel.getById(parseInt(memberId, 10));
    
    if (!member) {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    }

    const taskStats = await taskStatsModel.getMemberTaskStats(parseInt(memberId, 10));
    
    return responseUtil.success(res, taskStats);
  } catch (error) {
    logger.error(`获取会员任务数据统计失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 发放奖励给会员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function grantReward(req, res) {
  try {
    const { memberId, amount, remark } = req.body;
    
    // 获取操作员信息
    const operatorId = req.user.id;
    
    // 调用模型层方法发放奖励，直接传递操作人ID
    const result = await memberModel.grantReward(
      parseInt(memberId, 10),
      parseFloat(amount),
      remark,
      operatorId
    );
    
    // 记录操作日志
    logger.info(`会员奖励发放 - 操作员ID: ${operatorId}, 会员ID: ${memberId}, 金额: ${amount}, 备注: ${remark}`);
    
    return responseUtil.success(res, result.data);
  } catch (error) {
    logger.error(`发放会员奖励失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '会员不存在') {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    } else if (error.message === '奖励金额必须大于0') {
      return responseUtil.badRequest(res, i18n.t('admin.member.rewardAmountInvalid', req.lang));
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 从会员账户扣除奖励
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deductReward(req, res) {
  try {
    const { memberId, amount, remark } = req.body;
    
    // 获取操作员信息
    const operatorId = req.user.id;
    
    // 调用模型层方法扣除奖励，直接传递操作人ID
    const result = await memberModel.deductReward(
      parseInt(memberId, 10),
      parseFloat(amount),
      remark,
      operatorId
    );
    
    // 记录操作日志
    logger.info(`会员奖励扣除 - 操作员ID: ${operatorId}, 会员ID: ${memberId}, 金额: ${amount}, 备注: ${remark}`);
    
    return responseUtil.success(res, result.data);
  } catch (error) {
    logger.error(`扣除会员奖励失败: ${error.message}`);
    
    // 处理特定错误
    if (error.message === '会员不存在') {
      return responseUtil.notFound(res, i18n.t('admin.member.notFound', req.lang));
    } else if (error.message === '扣除金额必须大于0') {
      return responseUtil.badRequest(res, i18n.t('admin.member.deductAmountInvalid', req.lang));
    }
    
    return responseUtil.serverError(res);
  }
}

/**
 * 获取会员账户余额信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getMemberBalance(req, res) {
  try {
    const memberId = parseInt(req.params.id, 10);
    
    if (!memberId || isNaN(memberId)) {
      return responseUtil.badRequest(res, '无效的会员ID');
    }
    
    // 获取会员余额
    const balance = await memberBalanceModel.getBalance(memberId);
    const withdrawalAmount = await memberBalanceModel.getWithdrawalAmount(memberId);
    
    // 返回余额信息
    return responseUtil.success(res, {
      balance,
      withdrawalAmount
    });
  } catch (error) {
    logger.error(`获取会员账户余额失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取会员提现账户列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getWithdrawalAccounts(req, res) {
  try {
    const { id: memberId } = req.params;
    
    if (!memberId) {
      return responseUtil.badRequest(res, '会员ID不能为空');
    }
    
    const accounts = await withdrawalAccountModel.getWithdrawalAccountsByMemberId(parseInt(memberId, 10));
    
    return responseUtil.success(res, accounts);
  } catch (error) {
    logger.error(`获取会员提现账户列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 导出会员列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportMembers(req, res) {
  try {
    const { memberNickname, groupId } = req.query;
    
    // 构建筛选条件
    const filters = {
      exportMode: true // 标记为导出模式，不使用分页
    };
    
    if (memberNickname) filters.memberNickname = memberNickname;
    if (groupId) filters.groupId = parseInt(groupId, 10);
    
    // 获取所有符合条件的会员
    const result = await memberModel.getList(filters);
    
    if (!result.list || result.list.length === 0) {
      return res.status(404).send('没有符合条件的会员数据');
    }
    
    // 创建Excel工作簿和工作表
    const Excel = require('exceljs');
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('会员列表');
    
    // 设置列定义和宽度
    worksheet.columns = [
      { header: '会员ID', key: 'nickname', width: 20 },
      { header: '会员账号', key: 'account', width: 20 },
      { header: '注册时间', key: 'createTime', width: 20 },
      { header: '邀请人', key: 'inviterNickname', width: 20 },
      { header: '完成任务次数', key: 'completedTaskCount', width: 20 },
      { header: '所属群组', key: 'groups', width: 30 },
      { header: '账号列表', key: 'accountList', width: 40 },
    ];
    
    // 添加数据行
    result.list.forEach((item, index) => {
      // 格式化群组信息：群主的群组显示为"群组名(群主)"
      const groupsText = item.groups.map(group => {
        return group.isOwner ? `${group.groupName} (群主)` : group.groupName;
      }).join('\n');
      
      // 格式化账号列表
      const accountsText = item.accountList.map(account => {
        return `账号：${account.account || ''}\n主页：${account.homeUrl || ''}`;
      }).join('\n\n');
      
      const rowIndex = index + 2; // 头部行是第1行，所以数据从第2行开始
      
      worksheet.addRow({
        nickname: item.nickname || '',
        account: item.account || '',
        createTime: item.createTime || '',
        inviterNickname: item.inviterNickname || '',
        completedTaskCount: item.completedTaskCount || 0,
        groups: groupsText || '',
        accountList: accountsText || '',
      });
      
      // 设置单元格自动换行
      const groupsCell = worksheet.getCell(`F${rowIndex}`);
      groupsCell.alignment = { wrapText: true, vertical: 'top' };
      
      const accountsCell = worksheet.getCell(`G${rowIndex}`);
      accountsCell.alignment = { wrapText: true, vertical: 'top' };
      
      // 计算行高 - 根据内容多少自适应
      // 计算群组行数和账号列表行数
      const groupsLineCount = groupsText ? groupsText.split('\n').length : 0;
      // 账号列表中每个账号占用2行，账号之间有1行空行
      const accountsCount = item.accountList.length;
      const accountsLineCount = accountsCount > 0 ? (accountsCount * 2) + (accountsCount - 1) : 0;
      
      // 取两者的较大值，每行内容约占15像素高度，最小行高为20像素
      const contentLines = Math.max(groupsLineCount, accountsLineCount);
      const rowHeight = contentLines > 0 ? Math.max(contentLines * 18, 20) : 20;
      
      // 设置行高
      worksheet.getRow(rowIndex).height = rowHeight;
    });
    
    // 设置表格首行样式
    worksheet.getRow(1).height = 25; // 表头行高
    worksheet.getRow(1).font = { bold: true }; // 加粗表头
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=members.xlsx');
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`导出会员列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  list,
  getDetail,
  create,
  update,
  remove,
  getInviteStats,
  getTaskStats,
  grantReward,
  deductReward,
  getMemberBalance,
  getWithdrawalAccounts,
  exportMembers
}; 