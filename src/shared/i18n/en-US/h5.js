/*
 * @Author: diaochan
 * @Date: 2025-04-18 19:53:45
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-09 15:45:23
 * @Description: 
 */
module.exports = {
  loginSuccess: 'Login successful',
  notSetPassword: 'Account password not set, please contact the administrator',
  passwordError: 'Password error',
  userDisabled: 'User has been disabled',
  loginFailed: 'Login failed, please try again later',
  userNotFund: 'User does not exist',
  passwordNotMatch: 'New password and confirm password do not match',
  currentPasswordError: 'Current password is incorrect',
  passwordFormatError: 'New password must be 8-20 characters long and must contain letters and numbers',

  article: {
    notFound: 'Article not found',
  },

  group: {
    noPermission: 'You are not the owner of this group, so you do not have permission to view the member list',
    notFound: 'Group not found',
  },

  account: {
    notFound: 'Account not found',
    noPermissionView: 'You do not have permission to view this account',
    noPermissionUpdate: 'You do not have permission to update this account',
    noPermissionDelete: 'You do not have permission to delete this account',
    alreadyExists: 'One account per platform',
    addSuccess: 'Account added successfully, please wait for review',
    updateSuccess: 'Account updated successfully, please wait for review',
    deleteSuccess: 'Account deleted successfully',
    duplicateBind: 'This account has already been used. Duplicate binding is not allowed',
    rejectTimesLimit: 'Account rejection limit reached, cannot be updated again',
  },

  member: {
    notFound: 'Member not found',
  },

  notification: {
    notFound: 'Notification not found or you do not have permission to operate',
    markSuccess: 'Successfully marked {affectedCount} notifications as read',
  },

  task: {
    notFound: 'Task not found',
    onlyEnrollActiveTask: 'Only active tasks can be enrolled',
    memberNotFound: 'Member not found',
    alreadyEnrolled: 'You have already enrolled for this task',
    notMeetEnrollCondition: 'Does not meet the enrollment conditions',
    needAddAccount: 'Please add an account for the corresponding channel first',
    accountNotApproved: 'Your account for this channel has not been approved yet, please wait for approval before enrolling',
    submitSuccess: 'Task submitted successfully',
    resubmitSuccess: 'Task resubmitted successfully',
    onlySubmitActiveTask: 'Only active tasks can be submitted',
    forbiddenSubmitWithoutEnroll: 'Please enroll in the task first',
    taskSubmitted: 'Task submitted, being reviewed',
    taskSubmittedAndApproved: 'Task submitted and approved',
    taskFull: 'Task quota is full, cannot submit',
    noPermissionView: 'You do not have permission to view this submission record',
    rejectTimesLimit: 'Task rejection limit reached, cannot be updated again',
  },

  taskGroup: {
    notFound: 'Task group not found',
  },

  withdrawal: {
    notFound: 'Withdrawal account not found',
    noPermissionUpdate: 'You do not have permission to update this withdrawal account',
    noPermissionDelete: 'Withdrawal account not found or you do not have permission to delete',
    noPermissionUse: 'You do not have permission to use this withdrawal account',
    amountLimit: 'Withdrawal amount must be greater than 0',
    pendingWithdrawal: 'You have a pending withdrawal request, please wait for it to be processed before requesting again',
    insufficientBalance: 'Insufficient account balance',
  }
}