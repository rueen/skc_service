/**
 * 多语言资源主入口
 * 统一导出所有语言资源
 */
const zhCN = require('./zh-CN');
const enUS = require('./en-US');

module.exports = {
  'zh-CN': zhCN,
  'en-US': enUS
}; 