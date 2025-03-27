/*
 * @Author: diaochan
 * @Date: 2025-03-27 18:32:46
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:33:07
 * @Description: 
 */
// 直接导出所有共享中间件
const sharedAuthMiddleware = require('../../shared/middlewares/auth.middleware');

module.exports = sharedAuthMiddleware; 