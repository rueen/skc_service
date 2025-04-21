/*
 * @Author: diaochan
 * @Date: 2025-04-17 11:40:52
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 22:50:30
 * @Description: 
 */
/**
 * 国际化工具函数
 * 提供多语言支持功能
 */
const i18nResources = require('../i18n');

/**
 * 获取翻译文本
 * @param {string} key - 翻译键，格式为 "模块.键名" 或 "模块.子模块.键名"，例如 "common.success" 或 "common.validation.required"
 * @param {string} lang - 语言代码，默认为 "zh-CN"
 * @param {Object} params - 替换参数，用于替换翻译文本中的占位符
 * @returns {string} 翻译后的文本
 */
function t(key, lang = 'zh-CN', params = {}) {
  // 如果语言代码不存在，默认使用中文
  if (!['zh-CN', 'en-US', 'zh-TW', 'tl-PH'].includes(lang)) {
    lang = 'en-US';
  }

  // 解析键名
  const keyParts = key.split('.');
  if (keyParts.length < 2) {
    return key; // 键格式不正确，直接返回原始键
  }

  // 第一部分是模块名
  const moduleName = keyParts[0];
  
  // 获取对应模块的语言资源
  let moduleResources = i18nResources[lang]?.[moduleName];
  if (!moduleResources) {
    return key; // 未找到模块资源，返回原始键
  }
  
  // 从第二部分开始遍历键路径
  let currentValue = moduleResources;
  for (let i = 1; i < keyParts.length; i++) {
    const part = keyParts[i];
    
    // 如果当前值不是对象或者不包含下一级键，则返回原始键
    if (typeof currentValue !== 'object' || currentValue === null || !(part in currentValue)) {
      return key;
    }
    
    // 继续深入下一级
    currentValue = currentValue[part];
  }
  
  // 检查最终值是否为字符串
  if (typeof currentValue !== 'string') {
    return key; // 最终值不是字符串，返回原始键
  }
  
  // 获取翻译文本
  let text = currentValue;
  
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