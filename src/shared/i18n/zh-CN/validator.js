/*
 * @Author: diaochan
 * @Date: 2025-04-17 10:07:10
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 10:26:02
 * @Description: 
 */
/**
 * 验证器 - 简体中文翻译
 */
module.exports = {
  account: {
    keyword: '关键词必须是字符串',
    account: '账号必须是字符串',
    channelId: '渠道ID必须是整数',
    accountAuditStatus: '账号审核状态无效',
    groupId: '群组ID必须是整数',
    memberId: '会员ID必须是整数',
    homeUrl: '个人主页URL格式不正确',
    uid: 'UID必须是字符串',
    fansCount: '粉丝数量必须是非负整数',
    friendsCount: '好友数量必须是非负整数',
    postsCount: '帖子数量必须是非负整数',
    ids: 'ID列表不能为空',
    rejectReason: '拒绝原因必须是字符串'
  },
  common: {
    required: '{field}不能为空',
    integer: '{field}必须是整数',
    string: '{field}必须是字符串',
    email: '邮箱格式不正确',
    phone: '手机号格式不正确',
    password: '密码必须包含字母和数字，长度在6-20之间',
    date: '日期格式不正确',
    url: 'URL格式不正确',
    min: '{field}不能小于{min}',
    max: '{field}不能大于{max}',
    range: '{field}必须在{min}和{max}之间',
    enum: '{field}值无效'
  }
}; 