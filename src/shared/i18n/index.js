/**
 * 多语言资源主入口
 * 统一导出所有语言资源
 */
const zhCN = require('./zh-CN');
const enUS = require('./en-US');
const zhTW = require('./zh-TW');
const tlPH = require('./tl-PH');
const jaJP = require('./ja-JP');

module.exports = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'zh-TW': zhTW,
  'tl-PH': tlPH,
  'ja-JP': jaJP
}; 