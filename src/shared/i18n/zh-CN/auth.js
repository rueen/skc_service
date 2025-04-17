/*
 * @Author: diaochan
 * @Date: 2025-04-17 19:32:02
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 19:58:34
 * @Description: 
 */
module.exports = {
  validation: {
    usernameNotEmpty: '用户名不能为空',
    passwordNotEmpty: '密码不能为空',
    loginTypeNotEmpty: '登录类型不能为空',
    invalidLoginType: '登录类型必须为phone或email',
    memberAccountNotEmpty: '账号不能为空',
    memberAccountMustBeString: '账号必须为字符串',
    areaCodeMustBeString: '区号必须为字符串',
    passwordLength: '密码长度必须在8-20个字符之间',
    passwordMustContainLetterAndNumber: '密码必须包含字母和数字',
    inviteCodeMustBeString: '邀请码必须为字符串',
    inviteCodeLength: '邀请码长度不能超过20个字符',
    currentPasswordNotEmpty: '当前密码不能为空',
    newPasswordNotEmpty: '新密码不能为空',
    newPasswordLength: '新密码长度必须在8-20个字符之间',
    newPasswordMustContainLetterAndNumber: '新密码必须包含字母和数字',
    confirmPasswordNotEmpty: '确认密码不能为空',
    confirmPasswordNotMatch: '确认密码与新密码不一致',
    confirmPasswordMustMatch: '确认密码必须与新密码一致'
  },

  admin: {
    invalidCredentials: '用户名或密码错误',
    loginSuccess: '登录成功',
    loginFailed: '登录失败',
    userNotFound: '用户不存在',
    getUserInfoFailed: '获取用户信息失败',
    logoutFailed: '退出登录失败'
  },

  h5: {
    invalidPhoneFormat: '手机号格式不正确',
    invalidEmailFormat: '邮箱格式不正确',
    invalidLoginType: '登录类型必须为phone或email',
    passwordNotSet: '账号密码未设置，请联系管理员',
    invalidPassword: '密码错误',
    userDisabled: '用户已被禁用',
    loginSuccess: '登录成功',
    loginFailed: '登录失败',
    userNotFound: '用户不存在',
    getUserInfoFailed: '获取用户信息失败',
    confirmPasswordNotMatch: '确认密码与新密码不一致',
    userNotFound: '用户不存在',
    invalidCurrentPassword: '当前密码不正确',
    invalidNewPassword: '新密码不符合要求，密码长度必须在8-20位之间，且必须包含字母和数字',
  }
}