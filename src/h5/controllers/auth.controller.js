/**
 * H5端认证控制器
 * 处理H5端用户认证相关的业务逻辑
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const memberModel = require('../../shared/models/member.model');
const { STATUS_CODES, MESSAGES } = require('../../shared/config/api.config');
const logger = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const authUtil = require('../../shared/utils/auth.util');

// JWT密钥和过期时间
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 用户注册
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function register(req, res) {
  try {
    const { memberAccount, password, memberNickname, inviteCode, loginType } = req.body;
    
    // 检查账号是否已存在
    const existingMember = await memberModel.getByAccount(memberAccount);
    if (existingMember) {
      return responseUtil.badRequest(res, '账号已存在');
    }
    
    // 加密密码
    const hashedPassword = await authUtil.hashPassword(password);
    
    // 创建会员
    const memberData = {
      memberAccount,
      password: hashedPassword,
      memberNickname,
      inviteCode
    };
    
    // 根据登录类型设置 phone 或 email 字段
    const actualLoginType = loginType || 'phone'; // 默认为手机号登录类型
    if (actualLoginType === 'phone') {
      memberData.phone = memberAccount;
    } else if (actualLoginType === 'email') {
      memberData.email = memberAccount;
    }
    
    const newMember = await memberModel.create(memberData);
    
    // 生成JWT令牌
    const token = authUtil.generateToken({
      id: newMember.id, 
      account: memberAccount,
      loginType: actualLoginType
    });
    
    return responseUtil.success(res, {
      token,
      userInfo: {
        id: newMember.id,
        nickname: memberNickname,
        avatar: '',
        loginType: actualLoginType,
        memberAccount: memberAccount,
        phone: actualLoginType === 'phone' ? memberAccount : '',
        email: actualLoginType === 'email' ? memberAccount : ''
      }
    }, '注册成功');
  } catch (error) {
    logger.error(`用户注册失败: ${error.message}`);
    return responseUtil.serverError(res, '注册失败，请稍后重试');
  }
}

/**
 * 用户登录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function login(req, res) {
  try {
    const { loginType, memberAccount, areaCode = '86', password } = req.body;
    
    if (!memberAccount) {
      return responseUtil.badRequest(res, '账号不能为空');
    }
    
    if (!password) {
      return responseUtil.badRequest(res, '密码不能为空');
    }
    
    // 验证账号格式
    const validatorUtil = require('../../shared/utils/validator.util');
    if (loginType === 'phone') {
      // 验证手机号格式
      if (!validatorUtil.isValidPhone(memberAccount)) {
        return responseUtil.badRequest(res, '手机号格式不正确');
      }
    } else if (loginType === 'email') {
      // 验证邮箱格式
      if (!validatorUtil.isValidEmail(memberAccount)) {
        return responseUtil.badRequest(res, '邮箱格式不正确');
      }
    } else {
      return responseUtil.badRequest(res, '不支持的登录类型');
    }
    
    // 查找会员 - 直接使用原始账号
    let member = await memberModel.getByAccount(memberAccount);
    
    // 如果用户不存在，自动注册
    if (!member) {
      // 生成随机昵称
      const randomNickname = `用户${Math.floor(Math.random() * 1000000)}`;
      
      // 加密密码
      const hashedPassword = await authUtil.hashPassword(password);
      
      // 创建会员数据 - 使用原始账号，不带前缀
      const memberData = {
        memberNickname: randomNickname,
        memberAccount: memberAccount,
        password: hashedPassword
      };
      
      // 根据登录类型设置 phone 或 email 字段
      if (loginType === 'phone') {
        memberData.phone = memberAccount;
      } else if (loginType === 'email') {
        memberData.email = memberAccount;
      }
      
      // 创建新会员
      const newMember = await memberModel.create(memberData);
      const createdMember = await memberModel.getById(newMember.id);
      
      // 生成JWT令牌
      const token = authUtil.generateToken({
        id: createdMember.id,
        account: createdMember.memberAccount,
        loginType: loginType // 在令牌中添加登录类型
      });
      
      // 构建用户信息
      const userInfo = {
        id: createdMember.id,
        nickname: createdMember.memberNickname,
        avatar: createdMember.avatar || '',
        loginType: loginType,
        memberAccount: memberAccount,
        phone: loginType === 'phone' ? memberAccount : (createdMember.phone || ''),
        email: loginType === 'email' ? memberAccount : (createdMember.email || '')
      };
      
      return responseUtil.success(res, {
        token,
        userInfo
      }, '登录成功');
    } else {
      // 验证密码
      if (!member.hasPassword) {
        return responseUtil.error(res, '账号密码未设置，请联系管理员', STATUS_CODES.BAD_REQUEST, STATUS_CODES.BAD_REQUEST);
      }
      
      const isMatch = await authUtil.comparePassword(password, member.password);
      if (!isMatch) {
        return responseUtil.error(res, '密码错误', STATUS_CODES.BAD_REQUEST, STATUS_CODES.BAD_REQUEST);
      }
      
      // 检查用户状态
      if (member.status === 0) {
        return responseUtil.error(res, '用户已被禁用', STATUS_CODES.FORBIDDEN, STATUS_CODES.FORBIDDEN);
      }
      
      // 生成JWT令牌
      const token = authUtil.generateToken({
        id: member.id,
        account: member.memberAccount,
        loginType: loginType // 在令牌中添加登录类型
      });
      
      // 构建用户信息
      const userInfo = {
        id: member.id,
        nickname: member.memberNickname,
        avatar: member.avatar || '',
        loginType: loginType,
        memberAccount: member.memberAccount,
        phone: loginType === 'phone' ? member.memberAccount : (member.phone || ''),
        email: loginType === 'email' ? member.memberAccount : (member.email || '')
      };
      
      return responseUtil.success(res, {
        token,
        userInfo
      }, '登录成功');
    }
  } catch (error) {
    logger.error(`用户登录失败: ${error.message}`);
    return responseUtil.serverError(res, '登录失败，请稍后重试');
  }
}

/**
 * 获取用户信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getUserInfo(req, res) {
  try {
    const userId = req.user.id;
    
    // 获取用户信息
    const member = await memberModel.getById(userId);
    if (!member) {
      return responseUtil.notFound(res, '用户不存在');
    }
    
    // 从令牌中获取登录类型，如果没有则尝试推断
    let loginType = req.user.loginType || '';
    
    // 如果令牌中没有登录类型，尝试从其他信息推断
    if (!loginType) {
      // 可以根据账号格式或其他信息推断登录类型
      // 例如，如果账号包含@，可能是邮箱
      if (member.memberAccount.includes('@')) {
        loginType = 'email';
      } else {
        // 默认为手机号登录
        loginType = 'phone';
      }
    }
    
    // 移除敏感信息
    delete member.password;
    
    // 添加登录类型信息
    member.loginType = loginType;
    
    // 如果有群组ID，获取群组信息
    if (member.groupId) {
      try {
        const groupModel = require('../../shared/models/group.model');
        const group = await groupModel.getById(member.groupId);
        if (group) {
          member.groupLink = group.groupLink;
        }
      } catch (groupError) {
        logger.error(`获取群组信息失败: ${groupError.message}`);
        // 不影响整体返回，只是群组链接可能为空
      }
    }
    
    return responseUtil.success(res, member);
  } catch (error) {
    logger.error(`获取用户信息失败: ${error.message}`);
    return responseUtil.serverError(res, '获取用户信息失败，请稍后重试');
  }
}

/**
 * 用户退出登录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function logout(req, res) {
  try {
    // 客户端需要清除token，服务端无需特殊处理
    return responseUtil.success(res, null, '退出登录成功');
  } catch (error) {
    logger.error(`用户退出登录失败: ${error.message}`);
    return responseUtil.serverError(res, '退出登录失败，请稍后重试');
  }
}

/**
 * 修改密码
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // 验证新密码与确认密码是否一致
    if (newPassword !== confirmPassword) {
      return responseUtil.badRequest(res, '新密码与确认密码不一致');
    }
    
    // 获取用户信息
    const member = await memberModel.getById(userId);
    if (!member) {
      return responseUtil.notFound(res, '用户不存在');
    }
    
    // 验证当前密码是否正确
    const isPasswordValid = await authUtil.comparePassword(currentPassword, member.password);
    if (!isPasswordValid) {
      return responseUtil.badRequest(res, '当前密码不正确');
    }
    
    // 验证新密码是否符合强密码规则
    const validatorUtil = require('../../shared/utils/validator.util');
    if (!validatorUtil.isStrongPassword(newPassword)) {
      return responseUtil.badRequest(res, '新密码不符合要求，密码长度必须在8-20位之间，且必须包含字母和数字');
    }
    
    // 加密新密码
    const hashedPassword = await authUtil.hashPassword(newPassword);
    
    // 更新密码
    const updateData = {
      id: userId,
      password: hashedPassword
    };
    
    const success = await memberModel.update(updateData);
    
    if (!success) {
      return responseUtil.serverError(res, '修改密码失败');
    }
    
    return responseUtil.success(res, null, '密码修改成功');
  } catch (error) {
    logger.error(`修改密码失败: ${error.message}`);
    return responseUtil.serverError(res, '修改密码失败，请稍后重试');
  }
}

module.exports = {
  register,
  login,
  getUserInfo,
  logout,
  changePassword
}; 