/**
 * 账号模块英文翻译
 * 包含与账号相关的所有文本
 */
module.exports = {
  // Field validation error messages
  validation: {
    keywordString: 'Keyword must be a string',
    accountString: 'Account must be a string',
    channelIdInt: 'Channel ID must be an integer',
    accountAuditStatusInvalid: 'Account audit status is invalid',
    groupIdInt: 'Group ID must be an integer',
    memberIdInt: 'Member ID must be an integer',
    idsArray: 'ids must be an array',
    idsNotEmpty: 'ids cannot be empty',
    rejectReasonRequired: 'Reject reason cannot be empty',
    rejectReasonString: 'Reject reason must be a string',
    uidString: 'UID must be a string',
    channelIdNotEmpty: 'Channel ID cannot be empty',
    channelIdInt: 'Channel ID must be an integer',
    accountNotEmpty: 'Account cannot be empty',
    accountLength: 'Account length cannot exceed 100 characters',
    uidLength: 'UID length cannot exceed 100 characters',
    homeUrlInvalid: 'Home URL must be a valid URL',
    fansCountNonNegative: 'Fans count must be a non-negative integer',
    friendsCountNonNegative: 'Friends count must be a non-negative integer',
    postsCountNonNegative: 'Posts count must be a non-negative integer',
    idNotEmpty: 'Account ID cannot be empty',
    idInt: 'Account ID must be an integer'
  },

  common: {
    uidUsed: 'The account is already used, forbidden to repeat binding'
  },

  admin: {
    idsNotEmpty: 'Account ID list cannot be empty',
    idNotEmpty: 'Account ID cannot be empty',
    accountNotExist: 'Account does not exist',
    accountNotAssociatedMember: 'Account is not associated with a member',
    accountHasGroup: 'Member already has a group, approved',
    memberNotExist: 'Member does not exist',
    memberNoInviter: 'Member【{nickname}】has no inviter, cannot automatically assign group',
    inviterNoGroup: 'Inviter does not have a group, cannot automatically assign group',
    assignedToInviterGroup: 'Assigned to inviter\'s group',
    inviterNoOwner: 'Inviter\'s group is full and has no owner',
    groupFull: 'Inviter\'s group is full, and all groups under the owner are also full',
    assignedToOwnerGroup: 'Assigned to other groups under the owner',
    batchResolveSuccess: 'Successfully approved {successCount} accounts, {failedCount} accounts failed to approve',
    batchResolveFailed: 'Failed to approve accounts',
    rejectReasonDefault: 'Rejected',
    rejectSuccess: 'Successfully rejected {updatedCount} accounts',
    rejectFailed: 'Failed to reject accounts',
    updateSuccess: 'Account updated successfully',
    updateFailed: 'Failed to edit account, please try again later',
    getAccountDetailFailed: 'Failed to get account details',
    deleteSuccess: 'Account deleted successfully',
    deleteFailed: 'Failed to delete account, please try again later'
  },

  h5: {
    getAccountsFailed: 'Failed to get member account list',
    invalidAccountId: 'Invalid account ID',
    accountNotExist: 'Account does not exist',
    unauthorizedAccess: 'Unauthorized access',
    forbiddenUpdate: 'Forbidden to update',
    getAccountDetailFailed: 'Failed to get account details',
    accountAlreadyExists: 'You have already added an account for this channel',
    addAccountSuccess: 'Account added successfully, please wait for approval',
    addAccountFailed: 'Failed to add account',
    updateAccountSuccess: 'Account updated successfully, please wait for approval',
    updateAccountFailed: 'Failed to update account',
    forbiddenDelete: 'Forbidden to delete',
    deleteSuccess: 'Account deleted successfully',
    deleteFailed: 'Failed to delete account'
  }
}; 