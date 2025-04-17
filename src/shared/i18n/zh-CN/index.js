/**
 * 中文语言资源入口
 * 统一导出所有中文语言资源
 */
const common = require('./common');
const account = require('./account');
const task = require('./task');
const article = require('./article');
const auth = require('./auth');
const channel = require('./channel');

module.exports = {
  common,
  account,
  task,
  article,
  auth,
  channel
}; 