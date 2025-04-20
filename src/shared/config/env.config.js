/**
 * 环境变量配置
 * 确保在应用启动时加载.env文件中的配置
 */
const path = require('path');
const dotenv = require('dotenv');
const logger = require('./logger.config');

// 加载环境变量
dotenv.config({
  path: path.resolve(process.cwd(), '.env')
});

// 验证OSS相关配置是否存在
const requiredOssEnvVars = [
  'OSS_ACCESS_KEY_ID',
  'OSS_ACCESS_KEY_SECRET',
  'OSS_REGION',
  'OSS_BUCKET'
];

const missingOssVars = requiredOssEnvVars.filter(varName => !process.env[varName]);

if (missingOssVars.length > 0) {
  logger.warn(`缺少OSS配置环境变量: ${missingOssVars.join(', ')}`);
  logger.warn('OSS功能可能无法正常工作');
} else {
  logger.info('OSS环境变量已加载');
}

module.exports = {
  // 导出环境变量相关功能
  isProduction: process.env.NODE_ENV === 'production'
}; 