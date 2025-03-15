/**
 * API 配置文件
 * 包含 API 相关的常量和配置项
 */

// API 前缀
const API_PREFIX = '/api/support';
const PUBLIC_API_PREFIX = '/api';

// 分页默认值
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

// 图片上传配置
const UPLOAD_CONFIG = {
  MAX_SIZE: 1024 * 1024, // 1MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
};

// 响应状态码
const STATUS_CODES = {
  SUCCESS: 0,           // 成功
  BAD_REQUEST: 400,     // 请求参数错误
  UNAUTHORIZED: 401,    // 未授权
  FORBIDDEN: 403,       // 禁止访问
  NOT_FOUND: 404,       // 资源不存在
  SERVER_ERROR: 500     // 服务器错误
};

// 响应消息
const MESSAGES = {
  SUCCESS: '操作成功',
  BAD_REQUEST: '请求参数错误',
  UNAUTHORIZED: '未授权访问',
  FORBIDDEN: '禁止访问',
  NOT_FOUND: '资源不存在',
  SERVER_ERROR: '服务器错误'
};

// 任务状态
const TASK_STATUS = {
  NOT_STARTED: 'not_started',  // 未开始
  PROCESSING: 'processing',    // 进行中
  ENDED: 'ended'              // 已结束
};

// 任务类型
const TASK_TYPE = {
  IMAGE_TEXT: 'image_text',   // 图文任务
  VIDEO: 'video'              // 视频任务
};

// 任务审核状态
const TASK_AUDIT_STATUS = {
  PENDING: 'pending',     // 待审核
  APPROVED: 'approved',   // 已通过
  REJECTED: 'rejected'    // 已拒绝
};

// 账号审核状态
const ACCOUNT_AUDIT_STATUS = {
  PENDING: 'pending',     // 待审核
  APPROVED: 'approved',   // 已通过
  REJECTED: 'rejected'    // 已拒绝
};

// 提现状态
const WITHDRAWAL_STATUS = {
  PENDING: 'pending',     // 待处理
  SUCCESS: 'success',     // 提现成功
  FAILED: 'failed'       // 提现失败
};

// 账单类型
const BILL_TYPE = {
  WITHDRAWAL: 'withdrawal',      // 提现
  TASK_INCOME: 'task_income',    // 任务收入
  INVITE_REWARD: 'invite_reward', // 邀请奖励
  GROUP_REWARD: 'group_reward'   // 群主奖励
};

// 职业类型
const OCCUPATION_TYPE = {
  HOUSEWIFE: 'housewife',      // 宝妈
  FREELANCER: 'freelancer',    // 自由职业
  STUDENT: 'student'           // 学生
};

// 结算状态
const SETTLEMENT_STATUS = {
  SETTLED: 'settled',    // 已结算
  FAILED: 'failed'       // 结算失败
};

// 权限列表
const PERMISSIONS = {
  TASK: {
    LIST: 'task:list',           // 查看任务列表
    CREATE: 'task:create',        // 新建任务
    EDIT: 'task:edit',           // 修改任务信息
    AUDIT: 'task:audit',         // 审核已提交的任务
    AUDIT_DETAIL: 'task:auditDetail' // 查看任务审核详情
  },
  ACCOUNT: {
    LIST: 'account:list'         // 查看账号审核列表
  },
  MEMBER: {
    LIST: 'member:list',         // 查看会员列表
    CREATE: 'member:create',      // 新建会员
    EDIT: 'member:edit',         // 修改会员信息
    VIEW: 'member:view'          // 查看会员详情
  },
  CHANNEL: {
    LIST: 'channel:list'         // 管理渠道信息
  },
  GROUP: {
    LIST: 'group:list'           // 管理群组信息
  },
  WAITER: {
    LIST: 'waiter:list'          // 管理小二账号
  },
  SETTLEMENT: {
    WITHDRAWAL: 'settlement:withdrawal',    // 管理提现申请
    OTHER_BILLS: 'settlement:otherBills'    // 管理其他类型账单
  },
  ARTICLE: {
    LIST: 'article:list'         // 管理系统文章内容
  }
};

module.exports = {
  API_PREFIX,
  PUBLIC_API_PREFIX,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  STATUS_CODES,
  MESSAGES,
  TASK_STATUS,
  TASK_TYPE,
  TASK_AUDIT_STATUS,
  ACCOUNT_AUDIT_STATUS,
  WITHDRAWAL_STATUS,
  BILL_TYPE,
  OCCUPATION_TYPE,
  SETTLEMENT_STATUS,
  PERMISSIONS,
  UPLOAD_CONFIG
}; 