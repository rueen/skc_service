/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:41:38
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-22 15:08:23
 * @Description: 
 */
/**
 * 公共中文翻译
 * 包含系统通用的提示信息和文本
 */
module.exports = {
  // 通用响应消息
  success: '成功',
  failed: '失败',
  serverError: '服务器错误，请稍后重试',
  badRequest: '请求参数错误',
  unauthorized: '未授权，请先登录',
  forbidden: '无权操作',
  notFound: '资源不存在',
  rateLimit: '请求过于频繁，请稍后再试',
  loginRateLimit: '登录尝试次数过多，请1小时后再试',
  
  // 其他通用翻译...
  validation: {
    page: '页码必须是大于0的整数',
    pageSize: '每页条数必须是大于0的整数',
    mustBeString: '{field}必须是字符串',
    mustBeInt: '{field}必须是整数',
    invalid: '{field}类型值无效',
    timeFormatInvalid: '{field}时间格式不正确',
    mustNotBeEmpty: '{field}不能为空',
    mustBeArray: '{field}必须是数组',
    formatInvalid: '{field}格式不正确',
    mustBeNonNegativeInteger: '{field}必须是非负整数',
    maxLength: '{field}长度不能超过{max}个字符',
    minLength: '{field}长度不能小于{min}个字符',
    memberAccountLength: '会员账号长度必须在4-50个字符之间',
    memberPasswordLength: '密码长度必须在8-20位之间',
    memberPasswordFormat: '密码必须包含字母和数字',
    confirmPasswordNotMatch: '确认密码与新密码不一致',
    amountFormat: '{field}金额格式不正确',
    waiterUsernameLength: '小二用户名长度必须在3-20个字符之间',
  }
}; 