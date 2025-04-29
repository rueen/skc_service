/*
 * @Author: diaochan
 * @Date: 2025-04-18 21:25:01
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-29 10:04:59
 * @Description: 
 */
module.exports = {
  usernameOrPasswordError: 'Username or password is incorrect',
  loginSuccess: 'Login successful',
  loginFailed: 'Login failed',
  userNotFound: 'User not found',

  account: {
    notFound: 'Account not found',
    notAssociatedWithMember: 'Account is not associated with a member',
    alreadyInGroup: 'Member already has a group, approved',
    memberNotFound: 'Member not found',
    noInviter: 'Member【{nickname}】has no inviter, cannot automatically assign a group',
    inviterNoGroup: 'Inviter has no group, cannot automatically assign a group',
    assignedToInviterGroup: 'Assigned to inviter\'s group',
    inviterNoOwner: 'Inviter\'s group is full and has no owner',
    inviterAllGroupFull: 'Inviter\'s group is full and all groups under the owner are full',
    assignedToOtherGroup: 'Assigned to other group under the owner',
    auditSuccess: 'Successfully approved {success} accounts, {failed} accounts audit failed',
    rejectSuccess: 'Successfully rejected {count} accounts',
    noPendingAccounts: 'Account status has been changed, cannot audit'
  },

  article: {
    locationExists: 'Article location identifier already exists',
    notFound: 'Article not found'
  },

  channel: {
    notFound: 'Channel not found',
    nameExists: 'Channel name already exists',
    associatedAccount: 'Channel has associated accounts, cannot be deleted',
    associatedTask: 'Channel has associated tasks, cannot be deleted'
  },

  group: {
    notFound: 'Group not found',
    ownerNotFound: 'Owner not found',
    associatedMember: 'Group has associated members, cannot be deleted'
  },

  member: {
    notFound: 'Member not found',
    passwordInvalid: 'Password does not meet the requirements, password length must be between 8 and 20 characters, and must contain letters and numbers',
    groupByIdNotFound: 'Group ID {parsedGroupId} not found',
    groupLimit: 'Group (ID:{parsedGroupId}) has reached the maximum number of members ({maxMembers})',
    accountExists: 'Member account already exists',
    groupNotFound: 'Group not found',
    inviterNotFound: 'Inviter not found',
    accountUsed: 'Member account is already used by another member',
    associatedAccount: 'Member has associated accounts, cannot be deleted',
    associatedTask: 'Member has associated tasks, cannot be deleted',
    associatedBill: 'Member has associated bills, cannot be deleted',
    rewardAmountInvalid: 'Reward amount must be greater than 0',
    deductAmountInvalid: 'Deduct amount must be greater than 0'
  },

  submittedTask: {
    notFound: 'Submitted task not found', 
    approveSuccess: 'Successfully approved {updatedCount} tasks',
    rejectSuccess: 'Successfully rejected {updatedCount} tasks',
    preApproveSuccess: 'Successfully pre-approved {updatedCount} tasks',
    preRejectSuccess: 'Successfully pre-rejected {updatedCount} tasks',
    noTasks: 'no tasks'
  },

  task: {
    notFound: 'Task not found'
  },

  waiter: {
    usernameExists: 'Username already exists',
    notFound: 'Waiter not found',
    notAllowedDeleteAdmin: 'Not allowed to delete admin account'
  },

  withdrawal: {
    noWithdrawalsResolve: 'Batch approval failed, no withdrawal requests符合条件的提现申请',
    noWithdrawalsReject: 'Batch rejection failed, no withdrawal requests符合条件的提现申请'
  }
}