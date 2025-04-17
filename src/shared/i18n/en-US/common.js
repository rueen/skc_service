/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:41:47
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 15:08:59
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
  
  validation: {
    // Common form validation
    required: '{field} cannot be empty',
    invalidFormat: '{field} format is incorrect',
  }
  
  // Other common translations...
}; 