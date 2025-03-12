/**
 * API 配置文件
 * 包含 API 相关的常量和配置项
 */

// API 前缀
const API_PREFIX = '/api/support';

// 分页默认值
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

// 响应状态码
const STATUS_CODES = {
  SUCCESS: 0,           // 成功
  BAD_REQUEST: 400,     // 请求参数错误
  UNAUTHORIZED: 401,    // 未授权
  FORBIDDEN: 403,       // 禁止访问
  NOT_FOUND: 404,       // 资源不存在
  SERVER_ERROR: 500     // 服务器错误
};

// 响应消息
const MESSAGES = {
  SUCCESS: '操作成功',
  BAD_REQUEST: '请求参数错误',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '禁止访问',
  NOT_FOUND: '资源不存在',
  SERVER_ERROR: '服务器错误'
};

module.exports = {
  API_PREFIX,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  STATUS_CODES,
  MESSAGES
}; 