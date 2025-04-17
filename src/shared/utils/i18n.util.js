/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:40:52
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 11:43:19
 * @Description: 
 */
/**
 * 国际化工具函数
 * 提供多语言支持功能
 */
const i18nResources = require('../i18n');

/**
 * 获取翻译文本
 * @param {string} key - 翻译键，格式为 "模块.键名"，例如 "common.success"
 * @param {string} lang - 语言代码，默认为 "zh-CN"
 * @param {Object} params - 替换参数，用于替换翻译文本中的占位符
 * @returns {string} 翻译后的文本
 */
function t(key, lang = 'zh-CN', params = {}) {
  // 如果语言代码不存在，默认使用中文
  if (!['zh-CN', 'en-US'].includes(lang)) {
    lang = 'zh-CN';
  }

  // 解析键名，获取模块和具体的键
  const [module, ...keyParts] = key.split('.');
  const finalKey = keyParts.join('.');

  // 获取对应模块的语言资源
  const moduleResources = i18nResources[lang]?.[module] || {};
  
  // 获取翻译文本
  let text = moduleResources[finalKey] || key;
  
  // 替换参数
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(paramKey => {
      text = text.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
    });
  }
  
  return text;
}

module.exports = {
  t
}; 