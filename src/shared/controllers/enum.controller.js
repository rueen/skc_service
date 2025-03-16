/**
 * 枚举控制器
 * 处理枚举常量相关的请求
 */
const enums = require('../config/enums');
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

/**
 * 获取枚举常量
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getEnum(req, res) {
  try {
    const { enumType } = req.params;
    const lang = req.query.lang || 'zh-CN';
    
    // 检查枚举类型是否存在
    if (!enums[enumType]) {
      return responseUtil.badRequest(res, '枚举类型不存在');
    }
    
    // 获取枚举值
    const enumValues = enums[enumType];
    
    // 获取对应的语言配置
    const langConfig = enums[`${enumType}Lang`];
    
    // 如果没有语言配置，直接返回枚举值
    if (!langConfig) {
      return responseUtil.success(res, enumValues);
    }
    
    // 构建返回数据，包含枚举值和对应的语言文本
    const result = {};
    
    Object.keys(enumValues).forEach(key => {
      const value = enumValues[key];
      result[key] = {
        value,
        text: langConfig[value]?.[lang] || value
      };
    });
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取枚举常量失败: ${error.message}`);
    return responseUtil.serverError(res, '获取枚举常量失败');
  }
}

/**
 * 获取所有枚举常量
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAllEnums(req, res) {
  try {
    const lang = req.query.lang || 'zh-CN';
    const result = {};
    
    // 遍历所有枚举类型
    Object.keys(enums).forEach(key => {
      // 跳过语言配置
      if (key.endsWith('Lang')) {
        return;
      }
      
      const enumValues = enums[key];
      const langConfig = enums[`${key}Lang`];
      
      if (!langConfig) {
        result[key] = enumValues;
        return;
      }
      
      // 构建包含文本的枚举数据
      const formattedEnum = {};
      Object.keys(enumValues).forEach(enumKey => {
        const value = enumValues[enumKey];
        formattedEnum[enumKey] = {
          value,
          text: langConfig[value]?.[lang] || value
        };
      });
      
      result[key] = formattedEnum;
    });
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取所有枚举常量失败: ${error.message}`);
    return responseUtil.serverError(res, '获取所有枚举常量失败');
  }
}

module.exports = {
  getEnum,
  getAllEnums
}; 