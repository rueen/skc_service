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
    const { memberAccount, password, memberNickname, inviteCode } = req.body;
    
    // 检查账号是否已存在
    const existingMember = await memberModel.getByAccount(memberAccount);
    if (existingMember) {
      return res.status(400).json({
        code: STATUS_CODES.BAD_REQUEST,
        message: '账号已存在'
      });
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 创建会员
    const memberData = {
      memberAccount,
      password: hashedPassword,
      memberNickname,
      inviteCode
    };
    
    const newMember = await memberModel.create(memberData);
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: newMember.id, account: newMember.memberAccount },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return res.json({
      code: STATUS_CODES.SUCCESS,
      message: '注册成功',
      data: {
        token,
        member: {
          id: newMember.id,
          memberAccount: newMember.memberAccount,
          memberNickname: newMember.memberNickname
        }
      }
    });
  } catch (error) {
    logger.error(`用户注册失败: ${error.message}`);
    return res.status(500).json({
      code: STATUS_CODES.SERVER_ERROR,
      message: '注册失败，请稍后重试'
    });
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
    
    // 根据登录类型构建会员账号
    let accountValue = '';
    
    if (loginType === 'phone') {
      if (!memberAccount) {
        return responseUtil.badRequest(res, '手机号不能为空');
      }
      accountValue = `phone_${memberAccount}`;
    } else if (loginType === 'email') {
      if (!memberAccount) {
        return responseUtil.badRequest(res, '邮箱不能为空');
      }
      accountValue = `email_${memberAccount}`;
    } else {
      return responseUtil.badRequest(res, '不支持的登录类型');
    }
    
    // 查找会员
    const member = await memberModel.getByAccount(accountValue);
    
    // 如果用户不存在，自动注册
    if (!member) {
      // 生成随机昵称
      const randomNickname = `用户${Math.floor(Math.random() * 1000000)}`;
      
      // 加密密码
      const hashedPassword = await authUtil.hashPassword(password);
      
      // 创建会员数据
      const memberData = {
        memberNickname: randomNickname,
        memberAccount: accountValue,
        password: hashedPassword
      };
      
      // 创建新会员
      const newMember = await memberModel.create(memberData);
      const createdMember = await memberModel.getById(newMember.id);
      
      // 生成JWT令牌
      const token = authUtil.generateToken({
        id: createdMember.id,
        account: createdMember.memberAccount
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
        account: member.memberAccount
      });
      
      // 构建用户信息
      const userInfo = {
        id: member.id,
        nickname: member.memberNickname,
        avatar: member.avatar || '',
        loginType: loginType,
        memberAccount: memberAccount
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
    
    // 确定登录类型
    let loginType = '';
    let memberAccount = '';
    
    if (member.memberAccount.startsWith('phone_')) {
      loginType = 'phone';
      memberAccount = member.memberAccount.replace('phone_', '');
    } else if (member.memberAccount.startsWith('email_')) {
      loginType = 'email';
      memberAccount = member.memberAccount.replace('email_', '');
    }
    
    // 构建用户信息
    const userInfo = {
      id: member.id,
      nickname: member.memberNickname,
      avatar: member.avatar || '',
      loginType: loginType,
      memberAccount: memberAccount
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