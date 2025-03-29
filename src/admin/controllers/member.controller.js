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
    return responseUtil.serverError(res, '获取会员列表失败');
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
      return responseUtil.notFound(res, '会员不存在');
    }

    return responseUtil.success(res, member);
  } catch (error) {
    logger.error(`获取会员详情失败: ${error.message}`);
    return responseUtil.serverError(res, '获取会员详情失败');
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
      return responseUtil.badRequest(res, '密码不符合要求，密码长度必须在8-20位之间，且必须包含字母和数字');
    }

    // 如果指定了群组，检查群组成员数是否达到上限
    if (groupIds && groupIds.length > 0) {
      // 检查每个群组是否存在
      for (const groupId of groupIds) {
        const parsedGroupId = parseInt(groupId, 10);
        // 检查群组是否存在
        const groupExists = await memberModel.checkGroupExists(parsedGroupId);
        if (!groupExists) {
          return responseUtil.badRequest(res, `群组ID ${parsedGroupId} 不存在`);
        }
        
        // 检查群组成员数是否达到上限
        const groupLimit = await groupModel.checkGroupLimit(parsedGroupId);
        if (groupLimit.isFull) {
          return responseUtil.badRequest(res, `群组(ID:${parsedGroupId})成员数已达到上限（${groupLimit.maxMembers}人）`);
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
    const actualNickname = memberNickname || `用户${Math.floor(Math.random() * 1000000)}`;

    // 设置默认头像
    const defaultAvatar = '';
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

    return responseUtil.success(res, result, '创建会员成功');
  } catch (error) {
    if (error.message === '会员账号已存在') {
      return responseUtil.badRequest(res, error.message);
    } else if (error.message.includes('群组不存在')) {
      return responseUtil.badRequest(res, error.message);
    } else if (error.message === '邀请人不存在') {
      return responseUtil.badRequest(res, error.message);
    }
    logger.error(`创建会员失败: ${error.message}`);
    return responseUtil.serverError(res, '创建会员失败');
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
      memberNickname, memberAccount, password, groupIds, inviterId, 
      occupation, phone, email, avatar, gender, telegram 
    } = req.body;

    if (!id) {
      return responseUtil.badRequest(res, '会员ID不能为空');
    }

    // 参数验证
    if (memberNickname && memberNickname.length > 50) {
      return responseUtil.badRequest(res, '会员昵称长度不能超过50个字符');
    }
    
    if (memberAccount && memberAccount.length > 50) {
      return responseUtil.badRequest(res, '会员账号长度不能超过50个字符');
    }
    
    // 验证职业类型
    if (occupation && !Object.values(OccupationType).includes(occupation)) {
      return responseUtil.badRequest(res, '无效的职业类型');
    }
    
    // 验证性别值是否有效
    if (gender !== undefined && ![0, 1, 2].includes(Number(gender))) {
      return responseUtil.badRequest(res, '无效的性别值，应为 0(男)、1(女) 或 2(保密)');
    }

    // 验证密码强度
    if (password) {
      const validatorUtil = require('../../shared/utils/validator.util');
      if (!validatorUtil.isStrongPassword(password)) {
        return responseUtil.badRequest(res, '密码不符合要求，密码长度必须在8-20位之间，且必须包含字母和数字');
      }
    }
    
    // 如果要更新群组ID，检查群组成员数是否达到上限
    if (groupIds !== undefined) {
      // 获取会员当前所在群组
      const currentMember = await memberModel.getById(parseInt(id, 10));
      if (!currentMember) {
        return responseUtil.notFound(res, '会员不存在');
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
            return responseUtil.badRequest(res, `群组ID ${parsedGroupId} 不存在`);
          }
          
          // 如果是新的群组（不在当前群组列表中），才检查成员数量限制
          if (!currentGroupIds.includes(parsedGroupId)) {
            // 检查群组成员数是否达到上限
            const groupLimit = await groupModel.checkGroupLimit(parsedGroupId);
            if (groupLimit.isFull) {
              return responseUtil.badRequest(res, `群组(ID:${parsedGroupId})成员数已达到上限（${groupLimit.maxMembers}人）`);
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
      occupation,
      phone,
      email,
      avatar,
      gender: gender !== undefined ? Number(gender) : undefined,
      telegram
    });

    if (!result) {
      return responseUtil.notFound(res, '会员不存在');
    }

    return responseUtil.success(res, null, '更新会员成功');
  } catch (error) {
    if (error.message === '会员不存在') {
      return responseUtil.notFound(res, error.message);
    }
    if (error.message === '会员账号已被其他会员使用') {
      return responseUtil.badRequest(res, error.message);
    }
    if (error.message.includes('群组不存在')) {
      return responseUtil.badRequest(res, error.message);
    }
    if (error.message === '邀请人不存在') {
      return responseUtil.badRequest(res, error.message);
    }
    logger.error(`更新会员失败: ${error.message}`);
    return responseUtil.serverError(res, '更新会员失败');
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
      return responseUtil.notFound(res, '会员不存在');
    }

    return responseUtil.success(res, null, '删除会员成功');
  } catch (error) {
    if (error.message === '会员不存在') {
      return responseUtil.notFound(res, error.message);
    }
    if (error.message.includes('该会员下存在关联')) {
      return responseUtil.badRequest(res, error.message);
    }
    logger.error(`删除会员失败: ${error.message}`);
    return responseUtil.serverError(res, '删除会员失败');
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
      return responseUtil.notFound(res, '会员不存在');
    }

    const inviteStats = await inviteModel.getInviteStats(parseInt(memberId, 10));
    
    return responseUtil.success(res, inviteStats);
  } catch (error) {
    logger.error(`获取会员邀请数据统计失败: ${error.message}`);
    return responseUtil.serverError(res, '获取会员邀请数据统计失败');
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
      return responseUtil.notFound(res, '会员不存在');
    }

    const taskStats = await taskStatsModel.getMemberTaskStats(parseInt(memberId, 10));
    
    return responseUtil.success(res, taskStats);
  } catch (error) {
    logger.error(`获取会员任务数据统计失败: ${error.message}`);
    return responseUtil.serverError(res, '获取会员任务数据统计失败');
  }
}

module.exports = {
  list,
  getDetail,
  create,
  update,
  remove,
  getInviteStats,
  getTaskStats
}; 