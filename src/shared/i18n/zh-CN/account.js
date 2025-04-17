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
    uidString: 'UID必须是字符串',
    channelIdNotEmpty: '渠道ID不能为空',
    channelIdInt: '渠道ID必须是整数',
    accountNotEmpty: '账号不能为空',
    accountLength: '账号长度不能超过100个字符',
    uidLength: 'UID长度不能超过100个字符',
    homeUrlInvalid: '主页链接必须是有效的URL',
    fansCountNonNegative: '粉丝数量必须是非负整数',
    friendsCountNonNegative: '好友数量必须是非负整数',
    postsCountNonNegative: '帖子数量必须是非负整数',
    idNotEmpty: '账号ID不能为空',
    idInt: '账号ID必须是整数'
  },

  common:{
    uidUsed: '该账号已被使用，禁止重复绑定'
  },

  admin: {
    idsNotEmpty: '账号ID列表不能为空',
    idNotEmpty: '账号ID不能为空',
    accountNotExist: '账号不存在',
    accountNotAssociatedMember: '账号未关联会员',
    accountHasGroup: '会员已有群组，审核通过',
    memberNotExist: '会员不存在',
    memberNoInviter: '会员【{nickname}】没有邀请人，无法自动分配群组',
    inviterNoGroup: '邀请人没有所属群，无法自动分配群组',
    assignedToInviterGroup: '分配到邀请人的群组',
    inviterNoOwner: '邀请人所在群组已满且没有群主',
    groupFull: '邀请人所在群组已满，且该群主名下所有群组均已满员',
    assignedToOwnerGroup: '分配到群主名下的其他群组',
    batchResolveSuccess: '成功审核通过 {successCount} 个账号，{failedCount} 个账号审核失败',
    batchResolveFailed: '批量审核通过账号失败',
    rejectReasonDefault: '审核未通过',
    rejectSuccess: '成功拒绝 {updatedCount} 个账号',
    rejectFailed: '批量审核拒绝账号失败',
    updateSuccess: '账号更新成功',
    updateFailed: '编辑账号失败，请稍后重试',
    getAccountDetailFailed: '获取账号详情失败',
    deleteSuccess: '账号删除成功',
    deleteFailed: '删除账号失败，请稍后重试'
  },

  h5: {
    getAccountsFailed: '获取会员账号列表失败',
    invalidAccountId: '无效的账号ID',
    accountNotExist: '账号不存在',
    unauthorizedAccess: '无权查看此账号',
    forbiddenUpdate: '无权更新此账号',
    getAccountDetailFailed: '获取账号详情失败',
    accountAlreadyExists: '您已添加过该渠道的账号',
    addAccountSuccess: '添加账号成功，请等待审核',
    addAccountFailed: '添加账号失败',
    updateAccountSuccess: '账号更新成功，请等待审核',
    updateAccountFailed: '更新账号失败',
    forbiddenDelete: '无权删除此账号',
    deleteSuccess: '删除账号成功',
    deleteFailed: '删除账号失败'
  }
}; 