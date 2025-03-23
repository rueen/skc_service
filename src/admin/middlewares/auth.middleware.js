/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-23 16:43:10
 * @Description: 管理后台认证中间件包装
 */
/**
 * 管理后台认证中间件
 * 为了保持兼容性，直接从共享中间件重新导出
 */

// 直接导出所有共享中间件
const sharedAuthMiddleware = require('../../shared/middlewares/auth.middleware');

module.exports = sharedAuthMiddleware; 