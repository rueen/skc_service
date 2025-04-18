/**
 * 账号模块英文翻译
 * 包含与账号相关的所有文本
 */
module.exports = {
  // Account login
  login: {
    title: 'Account Login',
    username: 'Username',
    password: 'Password',
    submit: 'Login',
    success: 'Login successful',
    failed: 'Login failed, incorrect username or password',
    accountLocked: 'Account is locked, please contact administrator'
  },
  
  // Account registration
  register: {
    title: 'Account Registration',
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    email: 'Email',
    mobile: 'Mobile',
    submit: 'Register',
    success: 'Registration successful',
    failed: 'Registration failed',
    usernameExists: 'Username already exists',
    emailExists: 'Email already exists',
    mobileExists: 'Mobile number already exists',
    passwordMismatch: 'Passwords do not match'
  },
  
  // Field validation error messages
  validation: {
    keywordString: 'Keyword must be a string',
    accountString: 'Account must be a string',
    channelIdInt: 'Channel ID must be an integer',
    accountAuditStatusInvalid: 'Invalid account audit status',
    groupIdInt: 'Group ID must be an integer',
    memberIdInt: 'Member ID must be an integer'
  }
}; 