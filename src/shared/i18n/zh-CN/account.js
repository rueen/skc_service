/**
 * 账号模块中文翻译
 * 包含与账号相关的所有文本
 */
const common = require('./common');

module.exports = {
  // 字段验证错误消息
  validation: {
    ...common.validation,
    keywordString: '关键词必须是字符串',
    accountString: '账号必须是字符串',
    channelIdInt: '渠道ID必须是整数',
    accountAuditStatusInvalid: '账号审核状态无效',
    groupIdInt: '群组ID必须是整数',
    memberIdInt: '会员ID必须是整数'
  }
}; 