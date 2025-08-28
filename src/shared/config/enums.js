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
    'en-US': 'Not Started',
    'zh-TW': '未開始',
    'tl-PH': 'Hindi Pa Nagsisimula',
    'ja-JP': '未開始'
  },
  [TaskStatus.PROCESSING]: {
    'zh-CN': '进行中',
    'en-US': 'Processing',
    'zh-TW': '進行中',
    'tl-PH': 'Nagpoproseso',
    'ja-JP': '進行中'
  },
  [TaskStatus.ENDED]: {
    'zh-CN': '已结束',
    'en-US': 'Ended',
    'zh-TW': '已結束',
    'tl-PH': 'Natapos Na',
    'ja-JP': '終了済み'
  }
};

// 广告状态枚举
const AdStatus = {
  NOT_STARTED: 'not_started',  // 未开始
  PROCESSING: 'processing',    // 进行中
  ENDED: 'ended'              // 已结束
};

const AdStatusLang = {
  [TaskStatus.NOT_STARTED]: {
    'zh-CN': '未开始',
    'en-US': 'Not Started',
    'zh-TW': '未開始',
    'tl-PH': 'Hindi Pa Nagsisimula',
    'ja-JP': '未開始'
  },
  [TaskStatus.PROCESSING]: {
    'zh-CN': '进行中',
    'en-US': 'Processing',
    'zh-TW': '進行中',
    'tl-PH': 'Nagpoproseso',
    'ja-JP': '進行中'
  },
  [TaskStatus.ENDED]: {
    'zh-CN': '已结束',
    'en-US': 'Ended',
    'zh-TW': '已結束',
    'tl-PH': 'Natapos Na',
    'ja-JP': '終了済み'
  }
};

// 广告状态枚举
const MessagesStatus = {
  NOT_STARTED: 'not_started',  // 未开始
  PROCESSING: 'processing',    // 进行中
  ENDED: 'ended'              // 已结束
};

const MessagesStatusLang = {
  [TaskStatus.NOT_STARTED]: {
    'zh-CN': '未开始',
    'en-US': 'Not Started',
    'zh-TW': '未開始',
    'tl-PH': 'Hindi Pa Nagsisimula',
    'ja-JP': '未開始'
  },
  [TaskStatus.PROCESSING]: {
    'zh-CN': '进行中',
    'en-US': 'Processing',
    'zh-TW': '進行中',
    'tl-PH': 'Nagpoproseso',
    'ja-JP': '進行中'
  },
  [TaskStatus.ENDED]: {
    'zh-CN': '已结束',
    'en-US': 'Ended',
    'zh-TW': '已結束',
    'tl-PH': 'Natapos Na',
    'ja-JP': '終了済み'
  }
};

// 任务类型枚举
const TaskType = {
  POST: 'post',       // 图文
  VIDEO: 'video',     // 视频
  LIVE: 'live'        // 直播
};

const TaskTypeLang = {
  [TaskType.POST]: {
    'zh-CN': '图文',
    'en-US': 'POST',
    'zh-TW': '圖文',
    'tl-PH': 'POST',
    'ja-JP': '投稿'
  },
  [TaskType.VIDEO]: {
    'zh-CN': '视频',
    'en-US': 'VIDEO',
    'zh-TW': '視頻',
    'tl-PH': 'VIDEO',
    'ja-JP': '動画'
  },
  [TaskType.LIVE]: {
    'zh-CN': '直播',
    'en-US': 'LIVE',
    'zh-TW': '直播',
    'tl-PH': 'LIVE',
    'ja-JP': 'ライブ'
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
    'en-US': 'Pending',
    'zh-TW': '待審核',
    'tl-PH': 'Nakabinbin',
    'ja-JP': '審査待ち'
  },
  [TaskAuditStatus.APPROVED]: {
    'zh-CN': '已通过',
    'en-US': 'Approved',
    'zh-TW': '已通過',
    'tl-PH': 'Naaprubahan',
    'ja-JP': '承認済み'
  },
  [TaskAuditStatus.REJECTED]: {
    'zh-CN': '已拒绝',
    'en-US': 'Rejected',
    'zh-TW': '已拒絕',
    'tl-PH': 'Tinanggihan',
    'ja-JP': '拒否済み'
  }
};

// 任务预审状态枚举
const TaskPreAuditStatus = {
  PENDING: 'pending',     // 待审核
  APPROVED: 'approved',   // 已通过
  REJECTED: 'rejected'    // 已拒绝
};

const TaskPreAuditStatusLang = {
  [TaskPreAuditStatus.PENDING]: {
    'zh-CN': '待审核',
    'en-US': 'Pending',
    'zh-TW': '待審核',
    'tl-PH': 'Nakabinbin',
    'ja-JP': '事前審査待ち'
  },
  [TaskPreAuditStatus.APPROVED]: {
    'zh-CN': '已通过',
    'en-US': 'Approved',
    'zh-TW': '已通過',
    'tl-PH': 'Naaprubahan',
    'ja-JP': '事前承認済み'
  },
  [TaskPreAuditStatus.REJECTED]: {
    'zh-CN': '已拒绝',
    'en-US': 'Rejected',
    'zh-TW': '已拒絕',
    'tl-PH': 'Tinanggihan',
    'ja-JP': '事前拒否済み'
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
    'en-US': 'Pending',
    'zh-TW': '待審核',
    'tl-PH': 'Nakabinbin',
    'ja-JP': 'アカウント審査待ち'
  },
  [AccountAuditStatus.APPROVED]: {
    'zh-CN': '已通过',
    'en-US': 'Approved',
    'zh-TW': '已通過',
    'tl-PH': 'Naaprubahan',
    'ja-JP': 'アカウント承認済み'
  },
  [AccountAuditStatus.REJECTED]: {
    'zh-CN': '已拒绝',
    'en-US': 'Rejected',
    'zh-TW': '已拒絕',
    'tl-PH': 'Tinanggihan',
    'ja-JP': 'アカウント拒否済み'
  }
};

// 提现状态枚举
const WithdrawalStatus = {
  PENDING: 'pending',     // 待处理
  PROCESSING: 'processing', // 处理中
  SUCCESS: 'success',     // 提现成功
  FAILED: 'failed'       // 提现失败
};

const WithdrawalStatusLang = {
  [WithdrawalStatus.PENDING]: {
    'zh-CN': '待处理',
    'en-US': 'Pending',
    'zh-TW': '待處理',
    'tl-PH': 'Nakabinbin',
    'ja-JP': '処理待ち'
  },
  [WithdrawalStatus.PROCESSING]: {
    'zh-CN': '处理中',
    'en-US': 'Processing',
    'zh-TW': '處理中',
    'tl-PH': 'Nagpoproseso',
    'ja-JP': '処理中'
  },
  [WithdrawalStatus.SUCCESS]: {
    'zh-CN': '提现成功',
    'en-US': 'Success',
    'zh-TW': '提現成功',
    'tl-PH': 'Matagumpay',
    'ja-JP': '出金成功'
  },
  [WithdrawalStatus.FAILED]: {
    'zh-CN': '提现失败',
    'en-US': 'Failed',
    'zh-TW': '提現失敗',
    'tl-PH': 'Nabigo',
    'ja-JP': '出金失敗'
  }
};

// 账单类型枚举
const BillType = {
  WITHDRAWAL: 'withdrawal',      // 提现
  TASK_REWARD: 'task_reward',    // 任务奖励
  TASK_GROUP_REWARD: 'task_group_reward',  // 任务组奖励
  INVITE_REWARD: 'invite_reward', // 邀请奖励
  GROUP_OWNER_COMMISSION: 'group_owner_commission',   // 群主收益
  REWARD_GRANT: 'reward_grant',   // 奖励发放
  REWARD_DEDUCTION: 'reward_deduction'  // 奖励扣除
};

const BillTypeLang = {
  [BillType.WITHDRAWAL]: {
    'zh-CN': '提现',
    'en-US': 'Withdrawal',
    'zh-TW': '提現',
    'tl-PH': 'Pag-withdraw',
    'ja-JP': '出金'
  },
  [BillType.TASK_REWARD]: {
    'zh-CN': '任务奖励',
    'en-US': 'Task Reward',
    'zh-TW': '任務獎勵',
    'tl-PH': 'Gantimpala sa Gawain',
    'ja-JP': 'タスク報酬'
  },
  [BillType.TASK_GROUP_REWARD]: {
    'zh-CN': '任务组奖励',
    'en-US': 'Task Group Reward',
    'zh-TW': '任務組獎勵',
    'tl-PH': 'Gantimpala sa Grupo ng Gawain',
    'ja-JP': 'タスクグループ報酬'
  },
  [BillType.INVITE_REWARD]: {
    'zh-CN': '邀请奖励',
    'en-US': 'Invite Reward',
    'zh-TW': '邀請獎勵',
    'tl-PH': 'Gantimpala sa Pag-imbita',
    'ja-JP': '招待報酬'
  },
  [BillType.GROUP_OWNER_COMMISSION]: {
    'zh-CN': '群主收益',
    'en-US': 'Group Owner Commission',
    'zh-TW': '群主收益',
    'tl-PH': 'Komisyon ng May-ari ng Grupo',
    'ja-JP': 'グループオーナー手数料'
  },
  [BillType.REWARD_GRANT]: {
    'zh-CN': '奖励发放',
    'en-US': 'Reward Grant',
    'zh-TW': '獎勵發放',
    'tl-PH': 'Pagbibigay ng Gantimpala',
    'ja-JP': '報酬支給'
  },
  [BillType.REWARD_DEDUCTION]: {
    'zh-CN': '奖励扣除',
    'en-US': 'Reward Deduction',
    'zh-TW': '獎勵扣除',
    'tl-PH': 'Pagbawas ng Gantimpala',
    'ja-JP': '報酬控除'
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
    'en-US': 'Housewife',
    'zh-TW': '寶媽',
    'tl-PH': 'Maybahay',
    'ja-JP': '主婦'
  },
  [OccupationType.FREELANCER]: {
    'zh-CN': '自由职业',
    'en-US': 'Freelancer',
    'zh-TW': '自由職業',
    'tl-PH': 'Freelancer',
    'ja-JP': 'フリーランサー'
  },
  [OccupationType.STUDENT]: {
    'zh-CN': '学生',
    'en-US': 'Student',
    'zh-TW': '學生',
    'tl-PH': 'Estudyante',
    'ja-JP': '学生'
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
    'en-US': 'Male',
    'zh-TW': '男',
    'tl-PH': 'Lalaki',
    'ja-JP': '男性'
  },
  [GenderType.FEMALE]: {
    'zh-CN': '女',
    'en-US': 'Female',
    'zh-TW': '女',
    'tl-PH': 'Babae',
    'ja-JP': '女性'
  },
  [GenderType.SECRET]: {
    'zh-CN': '保密',
    'en-US': 'Secret',
    'zh-TW': '保密',
    'tl-PH': 'Lihim',
    'ja-JP': '非公開'
  }
};

// 结算状态枚举
const SettlementStatus = {
  SUCCESS: 'success',    // 结算成功
  FAILED: 'failed'       // 结算失败
};

const SettlementStatusLang = {
  [SettlementStatus.SUCCESS]: {
    'zh-CN': '结算成功',
    'en-US': 'Success',
    'zh-TW': '結算成功',
    'tl-PH': 'Matagumpay',
    'ja-JP': '清算成功'
  },
  [SettlementStatus.FAILED]: {
    'zh-CN': '结算失败',
    'en-US': 'Failed',
    'zh-TW': '結算失敗',
    'tl-PH': 'Nabigo',
    'ja-JP': '清算失敗'
  }
};

// 导出所有枚举
module.exports = {
  TaskStatus,
  TaskStatusLang,
  AdStatus,
  AdStatusLang,
  MessagesStatus,
  MessagesStatusLang,
  TaskType,
  TaskTypeLang,
  TaskAuditStatus,
  TaskAuditStatusLang,
  TaskPreAuditStatus,
  TaskPreAuditStatusLang,
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