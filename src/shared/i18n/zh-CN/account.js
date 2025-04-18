/**
 * 账号模块中文翻译
 * 包含与账号相关的所有文本
 */
module.exports = {
  // 字段验证错误消息
  validation: {
    keywordString: '关键词必须是字符串',
    accountString: '账号必须是字符串',
    channelIdInt: '渠道ID必须是整数',
    accountAuditStatusInvalid: '账号审核状态无效',
    groupIdInt: '群组ID必须是整数',
    memberIdInt: '会员ID必须是整数',
    idsArray: 'ids必须是数组',
    idsNotEmpty: 'ids不能为空',
    rejectReasonRequired: '拒绝原因不能为空',
    rejectReasonString: '拒绝原因必须是字符串',
    
    // 编辑账号字段验证
    homeUrlInvalid: '个人主页URL格式不正确',
    uidString: 'UID必须是字符串',
    fansCountNonNegative: '粉丝数量必须是非负整数',
    friendsCountNonNegative: '好友数量必须是非负整数',
    postsCountNonNegative: '帖子数量必须是非负整数'
  }
}; 