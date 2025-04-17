/*
 * @Author: diaochan
 * @Date: 2025-04-17 20:13:34
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-17 20:28:07
 * @Description: 
 */
module.exports = {
  validation: {
    keywordString: '关键字必须是字符串',
    idNotEmpty: '渠道ID不能为空',
    idInt: '渠道ID必须是整数',
    nameNotEmpty: '渠道名称不能为空',
    nameLength: '渠道名称长度不能超过50个字符',
    iconNotEmpty: '渠道图标不能为空',
    customFieldsArray: 'customFields必须是数组'
  },

  common: {
    nameExists: '渠道名称已存在',
    associatedAccounts: '该渠道下存在关联账号，无法删除',
    associatedTasks: '该渠道下存在关联任务，无法删除'
  },

  admin: {
    channelNotFound: '渠道不存在',
    idNotEmpty: '渠道ID不能为空',
  }
}