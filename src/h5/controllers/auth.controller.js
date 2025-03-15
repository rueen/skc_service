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
    
    const newMember = await memberModel.create(memberData);
    
    // 生成JWT令牌
    const token = authUtil.generateToken({
      id: newMember.id, 
      account: memberAccount,
      loginType: loginType || 'phone' // 默认为手机号登录类型
    });
    
    return responseUtil.success(res, {
      token,
      userInfo: {
        id: newMember.id,
        nickname: memberNickname,
        avatar: '',
        loginType: loginType || 'phone',
        memberAccount: memberAccount
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
    if (loginType === 'phone') {
      // 可以在这里添加手机号格式验证
    } else if (loginType === 'email') {
      // 可以在这里添加邮箱格式验证
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
        memberAccount: memberAccount
      };
      
      return responseUtil.success(res, {
        token,
        userInfo
      }, '登录成功');
    } else {
      // 验证密码
      if (!member.hasPassword) {
        return responseUtil.error(res, '账号密码未设置，请联系管理员', 1002, 400);
      }
      
      const isMatch = await authUtil.comparePassword(password, member.password);
      if (!isMatch) {
        return responseUtil.error(res, '密码错误', 1002, 400);
      }
      
      // 检查用户状态
      if (member.status === 0) {
        return responseUtil.error(res, '用户已被禁用', 1003, 403);
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
        memberAccount: member.memberAccount
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
    
    // 构建用户信息
    const userInfo = {
      id: member.id,
      nickname: member.memberNickname,
      avatar: member.avatar || '',
      loginType: loginType,
      memberAccount: member.memberAccount
    };
    
    return responseUtil.success(res, userInfo);
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

module.exports = {
  register,
  login,
  getUserInfo,
  logout
}; 