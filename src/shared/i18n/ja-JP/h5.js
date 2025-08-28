/*
 * @Author: diaochan
 * @Date: 2025-01-27 00:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-27 00:00:00
 * @Description: 
 */
module.exports = {
  loginSuccess: 'ログイン成功',
  notSetPassword: 'アカウントのパスワードが設定されていません。管理者にお問い合わせください',
  passwordError: 'パスワードが間違っています',
  userDisabled: 'ユーザーが無効になっています',
  loginFailed: 'ログインに失敗しました。しばらくしてから再試行してください',
  userNotFund: 'ユーザーが存在しません',
  passwordNotMatch: '新しいパスワードと確認パスワードが一致しません',
  currentPasswordError: '現在のパスワードが正しくありません',
  passwordFormatError: '新しいパスワードが要件を満たしていません。パスワードの長さは8〜20文字で、文字と数字を含む必要があります',

  article: {
    notFound: '記事が存在しません',
  },

  group: {
    noPermission: 'あなたはこのグループのオーナーではないため、メンバーリストを表示する権限がありません',
    notFound: 'グループが存在しません',
  },

  account: {
    notFound: 'アカウントが存在しません',
    noPermissionView: 'このアカウントを表示する権限がありません',
    noPermissionUpdate: 'このアカウントを更新する権限がありません',
    noPermissionDelete: 'このアカウントを削除する権限がありません',
    alreadyExists: '各プラットフォームには1つのアカウントのみ追加できます',
    addSuccess: 'アカウントの追加に成功しました。審査をお待ちください',
    updateSuccess: 'アカウントの更新に成功しました。審査をお待ちください',
    deleteSuccess: 'アカウントの削除に成功しました',
    duplicateBind: 'このアカウントは既に使用されており、重複して連携することはできません',
    rejectTimesLimit: 'アカウントの拒否回数が上限に達しており、再度変更することはできません',
  },

  member: {
    notFound: 'メンバーが存在しません',
  },

  notification: {
    notFound: '通知が存在しないか、操作する権限がありません',
    markSuccess: '{affectedCount}件の通知を既読として正常にマークしました',
  },

  task: {
    notFound: 'タスクが存在しません',
    onlyEnrollActiveTask: '進行中のタスクのみに参加できます',
    memberNotFound: 'メンバーが存在しません',
    alreadyEnrolled: '既にこのタスクに参加しています',
    notMeetEnrollCondition: '参加条件を満たしていません',
    needAddAccount: '対応するチャンネルのアカウントを先に追加してください',
    accountNotApproved: 'このチャンネルでのアカウントがまだ審査を通過していません。審査通過後に参加してください',
    needCompletePreviousTask: 'タスクグループ内の前のタスクを先に完了してください',
    submitSuccess: 'タスクの提出に成功しました',
    resubmitSuccess: 'タスクの再提出に成功しました',
    onlySubmitActiveTask: '進行中のタスクのみ提出できます',
    forbiddenSubmitWithoutEnroll: '先にタスクに参加してください',
    taskSubmitted: 'タスクは既に提出されており、審査中です',
    taskSubmittedAndApproved: 'タスクは既に提出され、審査を通過しています',
    taskFull: 'タスクの定員が満員のため、提出できません',
    noPermissionView: 'この提出記録を表示する権限がありません',
    rejectTimesLimit: 'このタスクの拒否回数が上限に達しており、再度変更することはできません',
  },

  taskGroup: {
    notFound: 'タスクグループが存在しません',
  },

  withdrawal: {
    notFound: '出金アカウントが存在しません',
    noPermissionUpdate: 'この出金アカウントを変更する権限がありません',
    noPermissionDelete: '出金アカウントが存在しないか、削除する権限がありません',
    noPermissionUse: 'この出金アカウントを使用する権限がありません',
    amountLimit: '出金金額は0より大きい必要があります',
    pendingWithdrawal: '処理待ちの出金申請があります。処理完了後に再度申請してください',
    insufficientBalance: 'アカウント残高が不足しています',
  }
}
