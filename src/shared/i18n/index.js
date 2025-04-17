/**
 * 多语言工具函数
 * 提供翻译加载、获取等功能
 */
const fs = require('fs');
const path = require('path');

// 缓存语言字典
const translations = {};
const DEFAULT_LANG = 'zh-CN';
const SUPPORTED_LANGS = ['zh-CN', 'en-US'];

/**
 * 递归加载语言文件
 */
function loadTranslations() {
  try {
    // 获取当前目录下的所有文件夹（语言目录）
    const languageDirs = fs.readdirSync(__dirname)
      .filter(dir => 
        fs.statSync(path.join(__dirname, dir)).isDirectory() && 
        SUPPORTED_LANGS.includes(dir)
      );
    
    // 遍历每种语言
    languageDirs.forEach(lang => {
      translations[lang] = {};
      
      // 读取该语言目录下的所有js文件
      const files = fs.readdirSync(path.join(__dirname, lang))
        .filter(file => file.endsWith('.js'));
      
      // 加载每个翻译模块
      files.forEach(file => {
        const moduleName = file.replace('.js', '');
        translations[lang][moduleName] = require(path.join(__dirname, lang, file));
      });
    });
    
    console.log('已加载多语言翻译模块:', Object.keys(translations).join(', '));
  } catch (error) {
    console.error('加载语言文件失败:', error);
  }
}

// 初始化时加载所有翻译
loadTranslations();

/**
 * 获取指定语言的翻译
 * @param {string} lang - 语言代码
 * @param {string} key - 翻译键路径，如 'account.list.success'
 * @param {Object} params - 替换参数
 * @returns {string} 翻译后的文本
 */
function getMessage(lang = DEFAULT_LANG, key, params = {}) {
  // 处理语言代码
  const shortLang = String(lang);
  const targetLang = SUPPORTED_LANGS.includes(shortLang) ? shortLang : DEFAULT_LANG;

  // 解析键路径
  const parts = key.split('.');
  if (parts.length < 2) {
    return key; // 如果键格式不正确，直接返回键名
  }
  
  const module = parts[0];
  const nestedKey = parts.slice(1).join('.');
  
  // 获取翻译
  let result;
  try {
    if (translations[targetLang] && translations[targetLang][module]) {
      result = getNestedValue(translations[targetLang][module], nestedKey);
    }
    
    // 如果没有找到，使用默认语言
    if (result === undefined && targetLang !== DEFAULT_LANG) {
      if (translations[DEFAULT_LANG] && translations[DEFAULT_LANG][module]) {
        result = getNestedValue(translations[DEFAULT_LANG][module], nestedKey);
      }
    }
  } catch (error) {
    console.error(`获取翻译失败 - 键: ${key}, 语言: ${lang}, 错误:`, error);
  }
  
  // 如果没有找到任何翻译，返回键名
  if (result === undefined) {
    return key;
  }
  
  // 替换参数
  return replaceParams(result, params);
}

/**
 * 获取嵌套对象中的值
 * @param {Object} obj - 对象
 * @param {string} path - 路径，如 'list.success'
 * @returns {any} 值
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : undefined, obj);
}

/**
 * 替换字符串中的参数
 * @param {string} str - 字符串模板，如 'Hello, {name}'
 * @param {Object} params - 参数对象，如 { name: 'John' }
 * @returns {string} 替换后的字符串
 */
function replaceParams(str, params) {
  if (typeof str !== 'string') return str;
  
  return str.replace(/{([^{}]*)}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? value : match;
  });
}

/**
 * 创建验证器消息获取函数
 * @param {string} module - 模块名称，如 'account'
 * @returns {Function} 验证器消息获取函数
 */
function createValidatorMessages(module) {
  return function(lang = DEFAULT_LANG) {
    const shortLang = String(lang).split('-')[0].toLowerCase();
    const targetLang = SUPPORTED_LANGS.includes(shortLang) ? shortLang : DEFAULT_LANG;
    
    const messages = {};
    
    // 尝试获取指定语言的验证消息
    if (translations[targetLang] && 
        translations[targetLang].validator && 
        translations[targetLang].validator[module]) {
      Object.assign(messages, translations[targetLang].validator[module]);
    } 
    // 回退到默认语言
    else if (targetLang !== DEFAULT_LANG && 
             translations[DEFAULT_LANG] && 
             translations[DEFAULT_LANG].validator && 
             translations[DEFAULT_LANG].validator[module]) {
      Object.assign(messages, translations[DEFAULT_LANG].validator[module]);
    }
    
    return messages;
  };
}

/**
 * 获取验证器消息
 * @param {string} lang - 语言代码
 * @param {string} module - 模块名称
 * @param {string} field - 字段名称
 * @param {Object} params - 替换参数
 * @returns {string} 验证消息
 */
function getValidatorMessage(lang, module, field, params = {}) {
  return getMessage(lang, `validator.${module}.${field}`, params);
}

// 导出函数
module.exports = {
  getMessage,
  getValidatorMessage,
  createValidatorMessages,
  SUPPORTED_LANGS
};
