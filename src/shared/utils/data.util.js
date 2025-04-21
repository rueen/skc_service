/**
 * 数据处理工具函数
 */

/**
 * 将数据库字段名转换为驼峰命名法
 * @param {Object} row - 数据库行数据
 * @returns {Object} - 转换后的对象
 */
const convertToCamelCase = (row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return row;
  }

  const result = {};
  
  Object.keys(row).forEach(key => {
    if (key.includes('_')) {
      // 处理包含下划线的字段名
      const camelCaseKey = key.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelCaseKey] = row[key];
    } else {
      // 保持原样的字段名
      result[key] = row[key];
    }
  });

  return result;
};

module.exports = {
  convertToCamelCase,
}; 