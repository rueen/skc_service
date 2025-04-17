/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:41:03
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 11:44:33
 * @Description: 
 */
/**
 * 国际化中间件
 * 用于从请求中提取语言参数
 */

/**
 * 从请求中提取语言参数
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express 下一个中间件函数
 */
function i18nMiddleware(req, res, next) {
  // 优先从查询参数中获取语言设置
  let lang = req.query.lang;
  
  // 如果查询参数中没有，则尝试从请求体中获取
  if (!lang && req.body) {
    lang = req.body.lang;
  }
  
  // 如果请求体中也没有，并且是 FormData，则尝试从 FormData 中获取
  if (!lang && req.is('multipart/form-data') && req.body) {
    lang = req.body.lang;
  }
  
  // 如果都没有找到，则使用默认语言
  if (!['zh-CN', 'en-US'].includes(lang)) {
    lang = 'zh-CN';
  }
  
  // 将语言设置保存到请求对象中，以便后续使用
  req.lang = lang;
  
  next();
}

module.exports = i18nMiddleware; 