/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:41:47
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-22 15:10:20
 * @Description: 
 */
/**
 * 公共英文翻译
 * 包含系统通用的提示信息和文本
 */
module.exports = {
  // Common response messages
  success: 'successful',
  failed: 'failed',
  serverError: 'Server error, please try again later',
  badRequest: 'Invalid request parameters',
  unauthorized: 'Unauthorized, please login first',
  forbidden: 'Access denied',
  notFound: 'Resource not found',
  rateLimit: 'Request too frequent, please try again later',
  loginRateLimit: 'Login attempt too frequent, please try again in 1 hour',
  
  // Other common translations...
  validation: {
    page: 'Page number must be greater than 0',
    pageSize: 'Page size must be greater than 0',
    mustBeString: '{field} must be a string',
    mustBeInt: '{field} must be an integer',
    invalid: '{field} is invalid',
    timeFormatInvalid: '{field} time format is invalid',
    mustNotBeEmpty: '{field} cannot be empty',
    mustBeArray: '{field} must be an array',
    formatInvalid: '{field} format is invalid',
    mustBeNonNegativeInteger: '{field} must be a non-negative integer',
    maxLength: '{field} must be less than {max} characters',
    minLength: '{field} must be greater than {min} characters',
    memberAccountLength: 'Member account length must be between 4 and 50 characters',
    memberPasswordLength: 'Password length must be between 8 and 20 characters',
    memberPasswordFormat: 'Password must contain letters and numbers',
    confirmPasswordNotMatch: 'Confirm password does not match new password',
    amountFormat: 'Amount format is invalid',
    waiterUsernameLength: 'Waiter username length must be between 3 and 20 characters',
  }
}; 