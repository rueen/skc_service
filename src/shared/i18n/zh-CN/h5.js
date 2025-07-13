/*
 * @Author: diaochan
 * @Date: 2025-04-18 19:53:45
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-09 15:44:43
 * @Description: 
 */
module.exports = {
  loginSuccess: '登录成功',
  notSetPassword: '账号密码未设置，请联系管理员',
  passwordError: '密码错误',
  userDisabled: '用户已被禁用',
  loginFailed: '登录失败，请稍后重试',
  userNotFund: '用户不存在',
  passwordNotMatch: '新密码与确认密码不一致',
  currentPasswordError: '当前密码不正确',
  passwordFormatError: '新密码不符合要求，密码长度必须在8-20位之间，且必须包含字母和数字',

  article: {
    notFound: '文章不存在',
  },

  group: {
    noPermission: '您不是该群的群主，无权查看成员列表',
    notFound: '群组不存在',
  },

  account: {
    notFound: '账号不存在',
    noPermissionView: '无权查看此账号',
    noPermissionUpdate: '无权更新此账号',
    noPermissionDelete: '无权删除此账号',
    alreadyExists: '每个平台仅能添加一个账号',
    addSuccess: '添加账号成功，请等待审核',
    updateSuccess: '更新账号成功，请等待审核',
    deleteSuccess: '删除账号成功',
    duplicateBind: '该账号已被使用，禁止重复绑定',
    rejectTimesLimit: '账号驳回次数已达上限，无法再次修改',
  },

  member: {
    notFound: '会员不存在',
  },

  notification: {
    notFound: '通知不存在或无权操作',
    markSuccess: '成功标记{affectedCount}条通知为已读',
  },

  task: {
    notFound: '任务不存在',
    onlyEnrollActiveTask: '只能报名进行中的任务',
    memberNotFound: '会员不存在',
    alreadyEnrolled: '已经报名过该任务',
    notMeetEnrollCondition: '不满足报名条件',
    submitSuccess: '任务提交成功',
    resubmitSuccess: '任务重新提交成功',
    onlySubmitActiveTask: '只能提交进行中的任务',
    forbiddenSubmitWithoutEnroll: '请先报名任务',
    taskSubmitted: '任务已提交，正在审核中',
    taskSubmittedAndApproved: '任务已提交并已通过审核',
    taskFull: '任务名额已满，无法提交',
    noPermissionView: '无权查看此提交记录',
    rejectTimesLimit: '该任务驳回次数已达上限，无法再次修改',
  },

  taskGroup: {
    notFound: '任务组不存在',
  },

  withdrawal: {
    notFound: '提现账户不存在',
    noPermissionUpdate: '没有权限修改此提现账户',
    noPermissionDelete: '提现账户不存在或无权删除',
    noPermissionUse: '没有权限使用此提现账户',
    amountLimit: '提现金额必须大于0',
    pendingWithdrawal: '您有待处理的提现申请，请等待处理完成后再申请',
    insufficientBalance: '账户余额不足',
  }
}