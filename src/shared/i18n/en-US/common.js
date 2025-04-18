/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:41:47
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 16:05:45
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
  
  // Other common translations...
  validation: {
    page: 'Page number must be greater than 0',
    pageSize: 'Page size must be greater than 0',
    mustBeString: '{field} must be a string',
    mustBeInt: '{field} must be an integer',
    invalid: '{field} is invalid',
    timeFormatInvalid: '{field} time format is invalid',
    mustNotBeEmpty: '{field} must not be empty',
  }
}; 