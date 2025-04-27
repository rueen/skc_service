/*
 * @Author: diaochan
 * @Date: 2025-04-18 22:37:54
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-27 15:33:51
 * @Description: 
 */
/**
 * 公共繁體中文翻譯
 * 包含系統通用的提示信息和文本
 */
module.exports = {
  // 通用响应消息
  success: '成功',
  failed: '失敗',
  serverError: '伺服器錯誤，請稍後重試',
  badRequest: '請求參數錯誤',
  unauthorized: '未授權，請先登錄',
  forbidden: '無權操作',
  notFound: '資源不存在',
  rateLimit: '請求過於頻繁，請稍後再試',
  loginRateLimit: '登錄嘗試次數過多，請1小時後再試',
  missingToken:'未提供認證權杖',
  invalidToken:'認證權杖無效或已過期',
  passwordChanged:'密碼已更改，請重新登錄',
  authFailed:'認證失敗',
  
  // 其他通用翻译...
  validation: {
    page: '頁碼必須是大於0的整數',
    pageSize: '每頁條數必須是大於0的整數',
    mustBeString: '{field}必須是字符串',
    mustBeInt: '{field}必須是整數',
    invalid: '{field}類型值無效',
    timeFormatInvalid: '{field}時間格式不正確',
    mustNotBeEmpty: '{field}不能為空',
    mustBeArray: '{field}必須是數組',
    formatInvalid: '{field}格式不正確',
    mustBeNonNegativeInteger: '{field}必須是非負整數',
    maxLength: '{field}長度不能超過{max}個字符',
    minLength: '{field}長度不能小於{min}個字符',
    memberAccountLength: '會員賬號長度必須在4-50個字符之間',
    memberPasswordLength: '密碼長度必須在8-20位之間',
    memberPasswordFormat: '密碼必須包含字母和數字',
    confirmPasswordNotMatch: '確認密碼與新密碼不一致',
    amountFormat: '{field}金額格式不正確',
    waiterUsernameLength: '小二用戶名長度必須在3-20個字符之間',
    mustBeObject: '{field}必須是對象',
  }
}; 