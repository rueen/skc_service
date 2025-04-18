/**
 * 账号模块中文翻译
 * 包含与账号相关的所有文本
 */
module.exports = {
  // 账号登录
  login: {
    title: '账号登录',
    username: '用户名',
    password: '密码',
    submit: '登录',
    success: '登录成功',
    failed: '登录失败，用户名或密码错误',
    accountLocked: '账号已锁定，请联系管理员'
  },
  
  // 账号注册
  register: {
    title: '账号注册',
    username: '用户名',
    password: '密码',
    confirmPassword: '确认密码',
    email: '邮箱',
    mobile: '手机号',
    submit: '注册',
    success: '注册成功',
    failed: '注册失败',
    usernameExists: '用户名已存在',
    emailExists: '邮箱已存在',
    mobileExists: '手机号已存在',
    passwordMismatch: '两次输入的密码不一致'
  },
  
  // 字段验证错误消息
  validation: {
    keywordString: '关键词必须是字符串',
    accountString: '账号必须是字符串',
    channelIdInt: '渠道ID必须是整数',
    accountAuditStatusInvalid: '账号审核状态无效',
    groupIdInt: '群组ID必须是整数',
    memberIdInt: '会员ID必须是整数'
  }
}; 