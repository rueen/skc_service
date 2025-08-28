/*
 * @Author: diaochan
 * @Date: 2025-01-27 00:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-27 00:00:00
 * @Description: 
 */
module.exports = {
  usernameOrPasswordError: 'ユーザー名またはパスワードが間違っています',
  loginSuccess: 'ログイン成功',
  loginFailed: 'ログインに失敗しました',
  userNotFound: 'ユーザーが存在しません',

  account: {
    notFound: 'アカウントが存在しません',
    notAssociatedWithMember: 'アカウントがメンバーに関連付けられていません',
    alreadyInGroup: 'メンバーは既にグループに所属しており、審査が承認されました',
    memberNotFound: 'メンバーが存在しません',
    noInviter: 'メンバー【{nickname}】に招待者がいないため、自動的にグループを割り当てることができません',
    inviterNoGroup: '招待者が所属するグループがないため、自動的にグループを割り当てることができません',
    assignedToInviterGroup: '招待者のグループに割り当てられました',
    inviterNoOwner: '招待者が所属するグループが満員で、グループオーナーがいません',
    inviterAllGroupFull: '招待者が所属するグループが満員で、そのグループオーナーの下にあるすべてのグループも満員です',
    assignedToOtherGroup: 'グループオーナーの下にある他のグループに割り当てられました',
    auditSuccess: '{success}個のアカウントの審査に成功し、{failed}個のアカウントの審査に失敗しました',
    rejectSuccess: '{count}個のアカウントを正常に拒否しました',
    noPendingAccounts: 'アカウントの状態が変更されており、審査できません'
  },

  article: {
    locationExists: '記事の位置識別子が既に存在します',
    notFound: '記事が存在しません'
  },

  channel: {
    notFound: 'チャンネルが存在しません',
    nameExists: 'チャンネル名が既に存在します',
    associatedAccount: 'このチャンネルには関連するアカウントがあるため、削除できません',
    associatedTask: 'このチャンネルには関連するタスクがあるため、削除できません'
  },

  group: {
    notFound: 'グループが存在しません',
    ownerNotFound: 'グループオーナーが存在しません',
    associatedMember: 'このグループには関連するメンバーがいるため、削除できません'
  },

  member: {
    notFound: 'メンバーが存在しません',
    passwordInvalid: 'パスワードが要件を満たしていません。パスワードの長さは8〜20文字で、文字と数字を含む必要があります',
    groupByIdNotFound: 'グループID {parsedGroupId} が存在しません',
    groupLimit: 'グループ（ID:{parsedGroupId}）のメンバー数が上限（{maxMembers}人）に達しています',
    accountExists: 'メンバーアカウントが既に存在します',
    groupNotFound: 'グループが存在しません',
    inviterNotFound: '招待者が存在しません',
    accountUsed: 'メンバーアカウントは既に他のメンバーによって使用されています',
    associatedAccount: 'このメンバーには関連するアカウントがあるため、削除できません',
    associatedTask: 'このメンバーには関連するタスクがあるため、削除できません',
    associatedBill: 'このメンバーには関連する請求書があるため、削除できません',
    rewardAmountInvalid: '報酬金額は0より大きい必要があります',
    deductAmountInvalid: '控除金額は0より大きい必要があります'
  },

  submittedTask: {
    notFound: '提出記録が見つかりません',
    approveSuccess: '{updatedCount}個のタスクの審査に成功しました',
    rejectSuccess: '{updatedCount}個のタスクを正常に拒否しました',
    preApproveSuccess: '{updatedCount}個のタスクの事前審査に成功しました',
    preRejectSuccess: '{updatedCount}個のタスクの事前審査を正常に拒否しました',
    noTasks: '条件に一致するタスクがありません'
  },

  task: {
    notFound: 'タスクが存在しません'
  },

  waiter: {
    usernameExists: 'ユーザー名が既に存在します',
    notFound: 'ウェイターが存在しません',
    notAllowedDeleteAdmin: '管理者アカウントの削除は許可されていません'
  },

  withdrawal: {
    noWithdrawalsResolve: '一括審査に失敗しました。条件に一致する出金申請がありません',
    noWithdrawalsReject: '一括拒否に失敗しました。条件に一致する出金申請がありません'
  }
}
