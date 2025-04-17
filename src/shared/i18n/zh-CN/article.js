/*
 * @Author: diaochan
 * @Date: 2025-04-17 17:27:25
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 18:09:46
 * @Description: 
 */
module.exports = {
  validation: {
    keywordString: '关键字必须是字符串',
    titleNotEmpty: '标题不能为空',
    titleLength: '标题长度不能超过100个字符',
    contentNotEmpty: '内容不能为空',
    locationLength: '位置标识长度不能超过50个字符',
    idNotEmpty: '文章ID不能为空',
    idInt: '文章ID必须是整数',
    locationNotEmpty: '位置标识不能为空',
    locationString: '位置标识必须是字符串'
  },

  common: {
    locationExists: '文章位置标识已存在'
  },

  admin: {
    getArticleListFailed: '获取文章列表失败',
    articleNotFound: '文章不存在'
  },

  h5: {
    articleNotFound: '文章不存在',
    getArticleDetailFailed: '获取文章详情失败'
  }
}