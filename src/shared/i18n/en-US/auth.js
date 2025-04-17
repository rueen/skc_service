/*
 * @Author: diaochan
 * @Date: 2025-04-17 19:32:02
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 19:58:41
 * @Description: 
 */
module.exports = {
  validation: {
    usernameNotEmpty: 'Username cannot be empty',
    passwordNotEmpty: 'Password cannot be empty',
    loginTypeNotEmpty: 'Login type cannot be empty',
    invalidLoginType: 'Login type must be phone or email',
    memberAccountNotEmpty: 'Account cannot be empty',
    memberAccountMustBeString: 'Account must be a string',
    areaCodeMustBeString: 'Area code must be a string',
    passwordLength: 'Password must be between 8 and 20 characters',
    passwordMustContainLetterAndNumber: 'Password must contain letters and numbers',
    inviteCodeMustBeString: 'Invite code must be a string',
    inviteCodeLength: 'Invite code must be less than 20 characters',
    currentPasswordNotEmpty: 'Current password cannot be empty',
    newPasswordNotEmpty: 'New password cannot be empty',
    newPasswordLength: 'New password must be between 8 and 20 characters',
    newPasswordMustContainLetterAndNumber: 'New password must contain letters and numbers',
    confirmPasswordNotEmpty: 'Confirm password cannot be empty',
    confirmPasswordNotMatch: 'Confirm password does not match new password',
    confirmPasswordMustMatch: 'Confirm password must match new password'
  },

  admin: {
    invalidCredentials: 'Invalid username or password',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    userNotFound: 'User not found',
    getUserInfoFailed: 'Failed to get user information',
    logoutFailed: 'Logout failed'
  },

  h5: {
    invalidPhoneFormat: 'Invalid phone format',
    invalidEmailFormat: 'Invalid email format',
    invalidLoginType: 'Login type must be phone or email',
    passwordNotSet: 'Account password not set, please contact the administrator',
    invalidPassword: 'Invalid password',
    userDisabled: 'User is disabled',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    userNotFound: 'User not found',
    getUserInfoFailed: 'Failed to get user information',
    confirmPasswordNotMatch: 'Confirm password does not match new password',
    userNotFound: 'User not found',
    invalidCurrentPassword: 'Current password is incorrect',
    invalidNewPassword: 'New password does not meet the requirements, password must be between 8 and 20 characters and must contain letters and numbers',
  }
}