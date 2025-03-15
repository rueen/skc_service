/**
 * 会员控制器
 * 处理会员相关的业务逻辑
 */
const memberModel = require('../../shared/models/member.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE, OCCUPATION_TYPE } = require('../../shared/config/api.config');

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

    const result = await memberModel.getList(filters, page, pageSize);
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
    const { memberNickname, memberAccount, password, groupId, inviterId, occupation, isGroupOwner } = req.body;

    // 参数验证
    if (!memberNickname || !memberAccount || !password) {
      return responseUtil.badRequest(res, '会员昵称、账号和密码为必填项');
    }

    if (memberNickname.length > 50) {
      return responseUtil.badRequest(res, '会员昵称长度不能超过50个字符');
    }
    
    if (memberAccount.length > 50) {
      return responseUtil.badRequest(res, '会员账号长度不能超过50个字符');
    }
    
    // 验证职业类型
    if (occupation && !Object.values(OCCUPATION_TYPE).includes(occupation)) {
      return responseUtil.badRequest(res, '无效的职业类型');
    }

    // 处理密码哈希
    const { hashPassword } = require('../../shared/utils/auth.util');
    const hashedPassword = await hashPassword(password);

    const result = await memberModel.create({
      memberNickname,
      memberAccount,
      password: hashedPassword,
      groupId: groupId ? parseInt(groupId, 10) : null,
      inviterId: inviterId ? parseInt(inviterId, 10) : null,
      occupation,
      isGroupOwner: !!isGroupOwner
    });

    return responseUtil.success(res, result, '创建会员成功');
  } catch (error) {
    if (error.message === '会员账号已存在') {
      return responseUtil.badRequest(res, error.message);
    }
    if (error.message === '所选群组不存在') {
      return responseUtil.badRequest(res, error.message);
    }
    if (error.message === '邀请人不存在') {
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
    const { memberNickname, memberAccount, password, groupId, inviterId, occupation, isGroupOwner } = req.body;

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
    if (occupation && !Object.values(OCCUPATION_TYPE).includes(occupation)) {
      return responseUtil.badRequest(res, '无效的职业类型');
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
      groupId: groupId !== undefined ? (groupId ? parseInt(groupId, 10) : null) : undefined,
      inviterId: inviterId !== undefined ? (inviterId ? parseInt(inviterId, 10) : null) : undefined,
      occupation,
      isGroupOwner: isGroupOwner !== undefined ? !!isGroupOwner : undefined
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
    if (error.message === '所选群组不存在') {
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

module.exports = {
  list,
  getDetail,
  create,
  update,
  remove
}; 