/**
 * 繁體中文 Admin 翻譯
 */
module.exports = {
  usernameOrPasswordError: '用戶名或密碼錯誤',
  loginSuccess: '登錄成功',
  loginFailed: '登錄失敗',
  userNotFound: '用戶不存在',

  account: {
    notFound: '賬號不存在',
    notAssociatedWithMember: '賬號未關聯會員',
    alreadyInGroup: '會員已有群組，審核通過',
    memberNotFound: '會員不存在',
    noInviter: '會員【{nickname}】沒有邀請人，無法自動分配群組',
    inviterNoGroup: '邀請人沒有所屬群，無法自動分配群組',
    assignedToInviterGroup: '分配到邀請人的群組',
    inviterNoOwner: '邀請人所在群組已滿且沒有群主',
    inviterAllGroupFull: '邀請人所在群組已滿，且該群主名下所有群組均已滿員',
    assignedToOtherGroup: '分配到群主名下的其他群組',
    auditSuccess: '成功審核通過 {success} 個賬號，{failed} 個賬號審核失敗',
    rejectSuccess: '成功拒絕 {count} 個賬號'
  },

  article: {
    locationExists: '文章位置標識已存在',
    notFound: '文章不存在'
  },

  channel: {
    notFound: '渠道不存在',
    nameExists: '渠道名稱已存在',
    associatedAccount: '該渠道下存在關聯賬號，無法刪除',
    associatedTask: '該渠道下存在關聯任務，無法刪除'
  },

  group: {
    notFound: '群組不存在',
    ownerNotFound: '群主不存在',
    associatedMember: '該群組下存在關聯會員，無法刪除'
  },

  member: {
    notFound: '會員不存在',
    passwordInvalid: '密碼不符合要求，密碼長度必須在8-20位之間，且必須包含字母和數字',
    groupByIdNotFound: '群組ID {parsedGroupId} 不存在',
    groupLimit: '群組(ID:{parsedGroupId})成員數已達到上限（{maxMembers}人）',
    accountExists: '會員賬號已存在',
    groupNotFound: '群組不存在',
    inviterNotFound: '邀請人不存在',
    accountUsed: '會員賬號已被其他會員使用',
    associatedAccount: '該會員下存在關聯賬號，無法刪除',
    associatedTask: '該會員下存在關聯任務，無法刪除',
    associatedBill: '該會員下存在關聯賬單，無法刪除',
    rewardAmountInvalid: '獎勵金額必須大於0',
    deductAmountInvalid: '扣除金額必須大於0'
  },

  submittedTask: {
    notFound: '未找到提交記錄',
    approveSuccess: '成功審核通過 {updatedCount} 個任務',
    rejectSuccess: '成功拒絕 {updatedCount} 個任務',
    preApproveSuccess: '成功預審通過 {updatedCount} 個任務',
    preRejectSuccess: '成功預審拒絕 {updatedCount} 個任務'
  },

  task: {
    notFound: '任務不存在'
  },

  waiter: {
    usernameExists: '用戶名已存在',
    notFound: '小二不存在',
    notAllowedDeleteAdmin: '不允許刪除管理員賬號'
  },

  withdrawal: {
    noWithdrawalsResolve: '批量審核失敗，沒有符合條件的提現申請',
    noWithdrawalsReject: '批量拒絕失敗，沒有符合條件的提現申請'
  }
}; 