/**
 * 中文语言资源入口
 * 统一导出所有中文语言资源
 */
const common = require('./common');
const account = require('./account');
const task = require('./task');
// 导入其他模块语言文件

module.exports = {
  common,
  account,
  task,
  // 导出其他模块
}; 