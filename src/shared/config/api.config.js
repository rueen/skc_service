/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-27 18:22:39
 * @Description: 
 */
/**
 * API 配置文件
 * 包含 API 相关的常量和配置项
 */

// 分页默认值
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

// 图片上传配置
const UPLOAD_CONFIG = {
  MAX_SIZE: 1024 * 1024, // 1MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
};

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  UPLOAD_CONFIG
}; 