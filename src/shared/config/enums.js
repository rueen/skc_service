/**
 * 系统枚举常量定义
 * 包含所有枚举值及其多语言文本
 */

// 任务状态枚举
const TaskStatus = {
  NOT_STARTED: 'not_started',  // 未开始
  PROCESSING: 'processing',    // 进行中
  ENDED: 'ended'              // 已结束
};

const TaskStatusLang = {
  [TaskStatus.NOT_STARTED]: {
    'zh-CN': '未开始',
    'en-US': 'Not Started'
  },
  [TaskStatus.PROCESSING]: {
    'zh-CN': '进行中',
    'en-US': 'Processing'
  },
  [TaskStatus.ENDED]: {
    'zh-CN': '已结束',
    'en-US': 'Ended'
  }
};

// 任务类型枚举
const TaskType = {
  IMAGE_TEXT: 'image_text',   // 图文任务
  VIDEO: 'video'              // 视频任务
};

const TaskTypeLang = {
  [TaskType.IMAGE_TEXT]: {
    'zh-CN': '图文',
    'en-US': 'Image & Text'
  },
  [TaskType.VIDEO]: {
    'zh-CN': '视频',
    'en-US': 'Video'
  }
};

// 任务审核状态枚举
const TaskAuditStatus = {
  PENDING: 'pending',     // 待审核
  APPROVED: 'approved',   // 已通过
  REJECTED: 'rejected'    // 已拒绝
};

const TaskAuditStatusLang = {
  [TaskAuditStatus.PENDING]: {
    'zh-CN': '待审核',
    'en-US': 'Pending'
  },
  [TaskAuditStatus.APPROVED]: {
    'zh-CN': '已通过',
    'en-US': 'Approved'
  },
  [TaskAuditStatus.REJECTED]: {
    'zh-CN': '已拒绝',
    'en-US': 'Rejected'
  }
};

// 账号审核状态枚举
const AccountAuditStatus = {
  PENDING: 'pending',     // 待审核
  APPROVED: 'approved',   // 已通过
  REJECTED: 'rejected'    // 已拒绝
};

const AccountAuditStatusLang = {
  [AccountAuditStatus.PENDING]: {
    'zh-CN': '待审核',
    'en-US': 'Pending'
  },
  [AccountAuditStatus.APPROVED]: {
    'zh-CN': '已通过',
    'en-US': 'Approved'
  },
  [AccountAuditStatus.REJECTED]: {
    'zh-CN': '已拒绝',
    'en-US': 'Rejected'
  }
};

// 提现状态枚举
const WithdrawalStatus = {
  PENDING: 'pending',     // 待处理
  SUCCESS: 'success',     // 提现成功
  FAILED: 'failed'       // 提现失败
};

const WithdrawalStatusLang = {
  [WithdrawalStatus.PENDING]: {
    'zh-CN': '待处理',
    'en-US': 'Pending'
  },
  [WithdrawalStatus.SUCCESS]: {
    'zh-CN': '提现成功',
    'en-US': 'Success'
  },
  [WithdrawalStatus.FAILED]: {
    'zh-CN': '提现失败',
    'en-US': 'Failed'
  }
};

// 账单类型枚举
const BillType = {
  WITHDRAWAL: 'withdrawal',      // 提现
  TASK_INCOME: 'task_income',    // 任务收入
  INVITE_REWARD: 'invite_reward', // 邀请奖励
  GROUP_REWARD: 'group_reward'   // 群主奖励
};

const BillTypeLang = {
  [BillType.WITHDRAWAL]: {
    'zh-CN': '提现',
    'en-US': 'Withdrawal'
  },
  [BillType.TASK_INCOME]: {
    'zh-CN': '任务收入',
    'en-US': 'Task Income'
  },
  [BillType.INVITE_REWARD]: {
    'zh-CN': '邀请奖励',
    'en-US': 'Invite Reward'
  },
  [BillType.GROUP_REWARD]: {
    'zh-CN': '群主奖励',
    'en-US': 'Group Reward'
  }
};

// 职业类型枚举
const OccupationType = {
  HOUSEWIFE: 'housewife',      // 宝妈
  FREELANCER: 'freelancer',    // 自由职业
  STUDENT: 'student'           // 学生
};

const OccupationTypeLang = {
  [OccupationType.HOUSEWIFE]: {
    'zh-CN': '宝妈',
    'en-US': 'Housewife'
  },
  [OccupationType.FREELANCER]: {
    'zh-CN': '自由职业',
    'en-US': 'Freelancer'
  },
  [OccupationType.STUDENT]: {
    'zh-CN': '学生',
    'en-US': 'Student'
  }
};

// 性别类型枚举
const GenderType = {
  MALE: 0,      // 男
  FEMALE: 1,    // 女
  SECRET: 2     // 保密
};

const GenderTypeLang = {
  [GenderType.MALE]: {
    'zh-CN': '男',
    'en-US': 'Male'
  },
  [GenderType.FEMALE]: {
    'zh-CN': '女',
    'en-US': 'Female'
  },
  [GenderType.SECRET]: {
    'zh-CN': '保密',
    'en-US': 'Secret'
  }
};

// 结算状态枚举
const SettlementStatus = {
  SETTLED: 'settled',    // 已结算
  FAILED: 'failed'       // 结算失败
};

const SettlementStatusLang = {
  [SettlementStatus.SETTLED]: {
    'zh-CN': '已结算',
    'en-US': 'Settled'
  },
  [SettlementStatus.FAILED]: {
    'zh-CN': '结算失败',
    'en-US': 'Failed'
  }
};

// 导出所有枚举
module.exports = {
  TaskStatus,
  TaskStatusLang,
  TaskType,
  TaskTypeLang,
  TaskAuditStatus,
  TaskAuditStatusLang,
  AccountAuditStatus,
  AccountAuditStatusLang,
  WithdrawalStatus,
  WithdrawalStatusLang,
  BillType,
  BillTypeLang,
  OccupationType,
  OccupationTypeLang,
  GenderType,
  GenderTypeLang,
  SettlementStatus,
  SettlementStatusLang
}; 