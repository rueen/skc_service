/*
 * @Author: diaochan
 * @Date: 2025-04-17 17:27:25
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 18:10:35
 * @Description: 
 */
module.exports = {
  validation: {
    keywordString: 'Keyword must be a string',
    titleNotEmpty: 'Title cannot be empty',
    titleLength: 'Title length cannot exceed 100 characters',
    contentNotEmpty: 'Content cannot be empty',
    locationLength: 'Location identifier length cannot exceed 50 characters',
    idNotEmpty: 'Article ID cannot be empty',
    idInt: 'Article ID must be an integer',
    locationNotEmpty: 'Location identifier cannot be empty',
    locationString: 'Location identifier must be a string'
  },

  common: {
    locationExists: 'Location identifier already exists'
  },

  admin: {
    getArticleListFailed: 'Get article list failed',
    articleNotFound: 'Article not found'
  },

  h5: {
    articleNotFound: 'Article not found',
    getArticleDetailFailed: 'Get article detail failed'
  }
}