/*
 * @Author: diaochan
 * @Date: 2025-04-18 22:38:15
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-09 15:45:07
 * @Description: 
 */
module.exports = {
  loginSuccess: '登錄成功',
  notSetPassword: '賬號密碼未設置，請聯繫管理員',
  passwordError: '密碼錯誤',
  userDisabled: '用戶已被禁用',
  loginFailed: '登錄失敗，請稍後重試',
  userNotFund: '用戶不存在',
  passwordNotMatch: '新密碼與確認密碼不一致',
  currentPasswordError: '當前密碼不正確',
  passwordFormatError: '新密碼不符合要求，密碼長度必須在8-20位之間，且必須包含字母和數字',

  article: {
    notFound: '文章不存在',
  },

  group: {
    noPermission: '您不是該群的群主，無權查看成員列表',
    notFound: '群組不存在',
  },

  account: {
    notFound: '賬號不存在',
    noPermissionView: '無權查看此賬號',
    noPermissionUpdate: '無權更新此賬號',
    noPermissionDelete: '無權刪除此賬號',
    alreadyExists: '每個平台僅能添加一個賬號',
    addSuccess: '添加賬號成功，請等待審核',
    updateSuccess: '更新賬號成功，請等待審核',
    deleteSuccess: '刪除賬號成功',
    duplicateBind: '該賬號已被使用，禁止重複綁定',
    rejectTimesLimit: '賬號駁回次數已達上限，無法再次修改',
  },

  member: {
    notFound: '會員不存在',
  },

  notification: {
    notFound: '通知不存在或無權操作',
    markSuccess: '成功標記{affectedCount}條通知為已讀',
  },

  task: {
    notFound: '任務不存在',
    onlyEnrollActiveTask: '只能報名進行中的任務',
    memberNotFound: '會員不存在',
    alreadyEnrolled: '已經報名過該任務',
    notMeetEnrollCondition: '不滿足報名條件',
    submitSuccess: '任務提交成功',
    resubmitSuccess: '任務重新提交成功',
    onlySubmitActiveTask: '只能提交進行中的任務',
    forbiddenSubmitWithoutEnroll: '請先報名任務',
    taskSubmitted: '任務已提交，正在審核中',
    taskSubmittedAndApproved: '任務已提交並已通過審核',
    taskFull: '任務名額已滿，無法提交',
    noPermissionView: '無權查看此提交記錄',
    rejectTimesLimit: '該任務駁回次數已達上限，無法再次修改',
  },

  taskGroup: {
    notFound: '任務組不存在',
  },

  withdrawal: {
    notFound: '提現賬戶不存在',
    noPermissionUpdate: '沒有權限修改此提現賬戶',
    noPermissionDelete: '提現賬戶不存在或無權刪除',
    noPermissionUse: '沒有權限使用此提現賬戶',
    amountLimit: '提現金額必須大於0',
    pendingWithdrawal: '您有待處理的提現申請，請等待處理完成後再申請',
    insufficientBalance: '賬戶餘額不足',
  }
}; 