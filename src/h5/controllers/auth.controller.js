/**
 * H5端认证控制器
 * 处理H5端用户认证相关的业务逻辑
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const memberModel = require('../../models/member.model');
const { STATUS_CODES, MESSAGES } = require('../../config/api.config');
const logger = require('../../config/logger.config');

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
    const { memberAccount, password } = req.body;
    
    // 查找会员
    const member = await memberModel.getByAccount(memberAccount);
    if (!member) {
      return res.status(400).json({
        code: STATUS_CODES.BAD_REQUEST,
        message: '账号或密码错误'
      });
    }
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(400).json({
        code: STATUS_CODES.BAD_REQUEST,
        message: '账号或密码错误'
      });
    }
    
    // 生成JWT令牌
    const token = jwt.sign(
      { id: member.id, account: member.memberAccount },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    return res.json({
      code: STATUS_CODES.SUCCESS,
      message: '登录成功',
      data: {
        token,
        member: {
          id: member.id,
          memberAccount: member.memberAccount,
          memberNickname: member.memberNickname
        }
      }
    });
  } catch (error) {
    logger.error(`用户登录失败: ${error.message}`);
    return res.status(500).json({
      code: STATUS_CODES.SERVER_ERROR,
      message: '登录失败，请稍后重试'
    });
  }
}

module.exports = {
  register,
  login
}; 