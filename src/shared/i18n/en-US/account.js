/**
 * 账号模块英文翻译
 * 包含与账号相关的所有文本
 */
module.exports = {
  // Field validation error messages
  validation: {
    keywordString: 'Keyword must be a string',
    accountString: 'Account must be a string',
    channelIdInt: 'Channel ID must be an integer',
    accountAuditStatusInvalid: 'Invalid account audit status',
    groupIdInt: 'Group ID must be an integer',
    memberIdInt: 'Member ID must be an integer',
    idsArray: 'ids must be an array',
    idsNotEmpty: 'ids cannot be empty',
    rejectReasonRequired: 'Reject reason cannot be empty',
    rejectReasonString: 'Reject reason must be a string',
    
    // Account edit field validation
    homeUrlInvalid: 'Personal homepage URL format is invalid',
    uidString: 'UID must be a string',
    fansCountNonNegative: 'Fans count must be a non-negative integer',
    friendsCountNonNegative: 'Friends count must be a non-negative integer',
    postsCountNonNegative: 'Posts count must be a non-negative integer'
  }
}; 