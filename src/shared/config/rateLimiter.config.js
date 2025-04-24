/*
 * @Author: diaochan
 * @Date: 2025-03-30 19:56:58
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-22 19:45:31
 * @Description: 
 */
/**
 * 限流配置
 * 控制API请求频率，防止服务器过载
 */

// 通用API限流配置
const apiLimiterConfig = {
  windowMs: 15 * 60 * 1000,                     // 时间窗口，默认15分钟
  max: 500000,                                     // 在windowMs内允许的最大请求数
  standardHeaders: true,                        // 返回标准的RateLimit头部信息
  legacyHeaders: false                          // 禁用旧版头部
};

// 登录接口限流配置（更严格）
const loginLimiterConfig = {
  windowMs: 60 * 60 * 1000,                     // 时间窗口，1小时
  max: 200000,                                      // 在windowMs内允许的最大请求数
  standardHeaders: true,                        // 返回标准的RateLimit头部信息
  legacyHeaders: false                          // 禁用旧版头部
};

module.exports = {
  apiLimiterConfig,
  loginLimiterConfig
}; 