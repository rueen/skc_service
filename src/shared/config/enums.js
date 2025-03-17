/**
 * 系统枚举常量定义
 * 包含所有枚举值及其多语言文本
 */
const { STATUS_CODES, MESSAGES, TASK_STATUS, TASK_TYPE, TASK_AUDIT_STATUS, 
  ACCOUNT_AUDIT_STATUS, WITHDRAWAL_STATUS, BILL_TYPE, OCCUPATION_TYPE, 
  GENDER_TYPE, SETTLEMENT_STATUS, PERMISSIONS } = require('./api.config');

// 任务状态枚举
const TaskStatus = TASK_STATUS;

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
const TaskType = TASK_TYPE;

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
const TaskAuditStatus = TASK_AUDIT_STATUS;

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
const AccountAuditStatus = ACCOUNT_AUDIT_STATUS;

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
const WithdrawalStatus = WITHDRAWAL_STATUS;

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
const BillType = BILL_TYPE;

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
const OccupationType = OCCUPATION_TYPE;

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
const GenderType = GENDER_TYPE;

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
const SettlementStatus = SETTLEMENT_STATUS;

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

// 响应状态码枚举
const StatusCodes = STATUS_CODES;

const StatusCodesLang = {
  [StatusCodes.SUCCESS]: {
    'zh-CN': '成功',
    'en-US': 'Success'
  },
  [StatusCodes.BAD_REQUEST]: {
    'zh-CN': '请求参数错误',
    'en-US': 'Bad Request'
  },
  [StatusCodes.UNAUTHORIZED]: {
    'zh-CN': '未授权',
    'en-US': 'Unauthorized'
  },
  [StatusCodes.FORBIDDEN]: {
    'zh-CN': '禁止访问',
    'en-US': 'Forbidden'
  },
  [StatusCodes.NOT_FOUND]: {
    'zh-CN': '资源不存在',
    'en-US': 'Not Found'
  },
  [StatusCodes.SERVER_ERROR]: {
    'zh-CN': '服务器错误',
    'en-US': 'Server Error'
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
  SettlementStatusLang,
  StatusCodes,
  StatusCodesLang
}; 