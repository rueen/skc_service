/**
 * 任务模块中文翻译
 * 包含与任务相关的所有文本
 */
module.exports = {
  // 任务列表
  list: {
    title: '任务列表',
    empty: '暂无任务',
    search: '搜索任务',
    filter: '筛选任务'
  },
  
  // 任务详情
  detail: {
    title: '任务详情',
    status: '任务状态',
    type: '任务类型',
    createTime: '创建时间',
    endTime: '结束时间',
    reward: '任务奖励',
    description: '任务描述'
  },
  
  // 任务状态
  status: {
    not_started: '未开始',
    processing: '进行中',
    ended: '已结束'
  },
  
  // 任务类型
  type: {
    post: '图文',
    video: '视频',
    live: '直播'
  },
  
  // 任务审核状态
  auditStatus: {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  },
  
  // 操作相关
  operation: {
    create: '创建任务',
    edit: '编辑任务',
    delete: '删除任务',
    submit: '提交任务',
    audit: '审核任务',
    start: '开始任务',
    end: '结束任务',
    createSuccess: '任务创建成功',
    editSuccess: '任务编辑成功',
    deleteSuccess: '任务删除成功',
    submitSuccess: '任务提交成功',
    auditSuccess: '任务审核成功',
    startSuccess: '任务已开始',
    endSuccess: '任务已结束'
  }
}; 