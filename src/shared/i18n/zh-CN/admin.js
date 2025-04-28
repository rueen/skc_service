/*
 * @Author: diaochan
 * @Date: 2025-04-18 19:53:22
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-29 07:33:35
 * @Description: 
 */
module.exports = {
  usernameOrPasswordError: '用户名或密码错误',
  loginSuccess: '登录成功',
  loginFailed: '登录失败',
  userNotFound: '用户不存在',

  account: {
    notFound: '账号不存在',
    notAssociatedWithMember: '账号未关联会员',
    alreadyInGroup: '会员已有群组，审核通过',
    memberNotFound: '会员不存在',
    noInviter: '会员【{nickname}】没有邀请人，无法自动分配群组',
    inviterNoGroup: '邀请人没有所属群，无法自动分配群组',
    assignedToInviterGroup: '分配到邀请人的群组',
    inviterNoOwner: '邀请人所在群组已满且没有群主',
    inviterAllGroupFull: '邀请人所在群组已满，且该群主名下所有群组均已满员',
    assignedToOtherGroup: '分配到群主名下的其他群组',
    auditSuccess: '成功审核通过 {success} 个账号，{failed} 个账号审核失败',
    rejectSuccess: '成功拒绝 {count} 个账号'
  },

  article: {
    locationExists: '文章位置标识已存在',
    notFound: '文章不存在'
  },

  channel: {
    notFound: '渠道不存在',
    nameExists: '渠道名称已存在',
    associatedAccount: '该渠道下存在关联账号，无法删除',
    associatedTask: '该渠道下存在关联任务，无法删除'
  },

  group: {
    notFound: '群组不存在',
    ownerNotFound: '群主不存在',
    associatedMember: '该群组下存在关联会员，无法删除'
  },

  member: {
    notFound: '会员不存在',
    passwordInvalid: '密码不符合要求，密码长度必须在8-20位之间，且必须包含字母和数字',
    groupByIdNotFound: '群组ID {parsedGroupId} 不存在',
    groupLimit: '群组(ID:{parsedGroupId})成员数已达到上限（{maxMembers}人）',
    accountExists: '会员账号已存在',
    groupNotFound: '群组不存在',
    inviterNotFound: '邀请人不存在',
    accountUsed: '会员账号已被其他会员使用',
    associatedAccount: '该会员下存在关联账号，无法删除',
    associatedTask: '该会员下存在关联任务，无法删除',
    associatedBill: '该会员下存在关联账单，无法删除',
    rewardAmountInvalid: '奖励金额必须大于0',
    deductAmountInvalid: '扣除金额必须大于0'
  },

  submittedTask: {
    notFound: '未找到提交记录',
    approveSuccess: '成功审核通过 {updatedCount} 个任务',
    rejectSuccess: '成功拒绝 {updatedCount} 个任务',
    preApproveSuccess: '成功预审通过 {updatedCount} 个任务',
    preRejectSuccess: '成功预审拒绝 {updatedCount} 个任务',
    noTasks: '没有符合条件的任务'
  },

  task: {
    notFound: '任务不存在'
  },

  waiter: {
    usernameExists: '用户名已存在',
    notFound: '小二不存在',
    notAllowedDeleteAdmin: '不允许删除管理员账号'
  },

  withdrawal: {
    noWithdrawalsResolve: '批量审核失败，没有符合条件的提现申请',
    noWithdrawalsReject: '批量拒绝失败，没有符合条件的提现申请'
  }
}