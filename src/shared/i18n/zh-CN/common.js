/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:41:38
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 16:07:13
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
  
  // 其他通用翻译...
  validation: {
    page: '页码必须是大于0的整数',
    pageSize: '每页条数必须是大于0的整数',
    mustBeString: '{field}必须是字符串',
    mustBeInt: '{field}必须是整数',
    invalid: '{field}无效',
    timeFormatInvalid: '{field}时间格式无效',
    mustNotBeEmpty: '{field}不能为空',
    mustBeArray: '{field}必须是数组',
  }
}; 