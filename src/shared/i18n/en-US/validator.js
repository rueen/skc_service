/*
 * @Author: diaochan
 * @Date: 2025-04-17 10:07:23
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 10:26:55
 * @Description: 
 */
/**
 * Validators - English Translation
 */
module.exports = {
  account: {
    keyword: 'Keyword must be a string',
    account: 'Account must be a string',
    channelId: 'Channel ID must be an integer',
    accountAuditStatus: 'Invalid account audit status',
    groupId: 'Group ID must be an integer',
    memberId: 'Member ID must be an integer',
    homeUrl: 'Homepage URL format is incorrect',
    uid: 'UID must be a string',
    fansCount: 'Fans count must be a non-negative integer',
    friendsCount: 'Friends count must be a non-negative integer',
    postsCount: 'Posts count must be a non-negative integer',
    ids: 'ID list cannot be empty',
    rejectReason: 'Reject reason must be a string'
  },
  common: {
    required: '{field} cannot be empty',
    integer: '{field} must be an integer',
    string: '{field} must be a string',
    email: 'Invalid email format',
    phone: 'Invalid phone number format',
    password: 'Password must include letters and numbers, length between 6-20',
    date: 'Invalid date format',
    url: 'Invalid URL format',
    min: '{field} cannot be less than {min}',
    max: '{field} cannot be greater than {max}',
    range: '{field} must be between {min} and {max}',
    enum: 'Invalid {field} value'
  }
}; 