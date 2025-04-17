# 多语言支持方案

## 需求概述

1. 支持语言：`zh-CN`（中文简体）和 `en-US`（英文），默认使用 `zh-CN`
2. 前端传参形式：
   ```js
   // 根据请求方法添加语言参数 lang：'zh-CN' | 'en-US'
   if (config.method.toLowerCase() === 'get') {
     config.params = { ...config.params, lang }
   } else {
     // 如果是 FormData，需要特殊处理
     if (config.data instanceof FormData) {
       config.data.append('lang', lang)
     } else {
       config.data = { ...config.data, lang }
     }
   }
   ```
3. 语言文件目录结构：
   - 所有语言文件统一放至 `src/shared/i18n` 目录
   - 中文放至 `src/shared/i18n/zh-CN`
   - 英文放至 `src/shared/i18n/en-US`
   - 按照模块创建单独的文件，例如：
     - `src/shared/i18n/zh-CN/account.js` - 存放 account 模块的所有中文翻译
     - `src/shared/i18n/zh-CN/common.js` - 存放所有公共中文翻译

4. 需要翻译的文件：
   - routes 文件
   - controllers 文件

5. 设计原则：
   - 易于理解
   - 使用方便

## 多语言架构设计

### 目录结构

```
src/
└── shared/
    └── i18n/
        ├── index.js            # 统一导出所有语言资源
        ├── zh-CN/              # 中文语言文件目录
        │   ├── index.js        # 导出所有中文语言资源
        │   ├── common.js       # 公共中文翻译
        │   ├── account.js      # 账号模块中文翻译
        │   ├── task.js         # 任务模块中文翻译
        │   └── ...             # 其他模块中文翻译
        └── en-US/              # 英文语言文件目录
            ├── index.js        # 导出所有英文语言资源
            ├── common.js       # 公共英文翻译
            ├── account.js      # 账号模块英文翻译
            ├── task.js         # 任务模块英文翻译
            └── ...             # 其他模块英文翻译
```

### 工具类设计

创建 `src/shared/utils/i18n.util.js` 文件，提供多语言工具函数：

```js
/**
 * 国际化工具函数
 * 提供多语言支持功能
 */
const i18nResources = require('../i18n');

/**
 * 获取翻译文本
 * @param {string} key - 翻译键，格式为 "模块.键名"，例如 "common.success"
 * @param {string} lang - 语言代码，默认为 "zh-CN"
 * @param {Object} params - 替换参数，用于替换翻译文本中的占位符
 * @returns {string} 翻译后的文本
 */
function t(key, lang = 'zh-CN', params = {}) {
  // 如果语言代码不存在，默认使用中文
  if (!['zh-CN', 'en-US'].includes(lang)) {
    lang = 'zh-CN';
  }

  // 解析键名，获取模块和具体的键
  const [module, ...keyParts] = key.split('.');
  const finalKey = keyParts.join('.');

  // 获取对应模块的语言资源
  const moduleResources = i18nResources[lang]?.[module] || {};
  
  // 获取翻译文本
  let text = moduleResources[finalKey] || key;
  
  // 替换参数
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(paramKey => {
      text = text.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
    });
  }
  
  return text;
}

module.exports = {
  t
};
```

### 中间件设计

创建 `src/shared/middlewares/i18n.middleware.js` 文件，用于解析请求中的语言参数：

```js
/**
 * 国际化中间件
 * 用于从请求中提取语言参数
 */

/**
 * 从请求中提取语言参数
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 * @param {Function} next - Express 下一个中间件函数
 */
function i18nMiddleware(req, res, next) {
  // 优先从查询参数中获取语言设置
  let lang = req.query.lang;
  
  // 如果查询参数中没有，则尝试从请求体中获取
  if (!lang && req.body) {
    lang = req.body.lang;
  }
  
  // 如果请求体中也没有，并且是 FormData，则尝试从 FormData 中获取
  if (!lang && req.is('multipart/form-data') && req.body) {
    lang = req.body.lang;
  }
  
  // 如果都没有找到，则使用默认语言
  if (!['zh-CN', 'en-US'].includes(lang)) {
    lang = 'zh-CN';
  }
  
  // 将语言设置保存到请求对象中，以便后续使用
  req.lang = lang;
  
  next();
}

module.exports = i18nMiddleware;
```

## 语言文件示例

### 主入口文件 (src/shared/i18n/index.js)

```js
/**
 * 多语言资源主入口
 * 统一导出所有语言资源
 */
const zhCN = require('./zh-CN');
const enUS = require('./en-US');

module.exports = {
  'zh-CN': zhCN,
  'en-US': enUS
};
```

### 中文入口文件 (src/shared/i18n/zh-CN/index.js)

```js
/**
 * 中文语言资源入口
 * 统一导出所有中文语言资源
 */
const common = require('./common');
const account = require('./account');
const task = require('./task');
// 导入其他模块语言文件

module.exports = {
  common,
  account,
  task,
  // 导出其他模块
};
```

### 公共中文翻译文件 (src/shared/i18n/zh-CN/common.js)

```js
/**
 * 公共中文翻译
 * 包含系统通用的提示信息和文本
 */
module.exports = {
  // 通用响应消息
  success: '操作成功',
  failed: '操作失败',
  serverError: '服务器错误，请稍后重试',
  badRequest: '请求参数错误',
  unauthorized: '未授权，请先登录',
  forbidden: '无权操作',
  notFound: '资源不存在',
  
  // 通用按钮文本
  save: '保存',
  cancel: '取消',
  confirm: '确认',
  submit: '提交',
  delete: '删除',
  
  // 通用提示文本
  loading: '加载中...',
  noData: '暂无数据',
  
  // 通用表单验证
  required: '{field}不能为空',
  invalidFormat: '{field}格式不正确',
  
  // 其他通用翻译...
};
```

### 账号模块中文翻译 (src/shared/i18n/zh-CN/account.js)

```js
/**
 * 账号模块中文翻译
 * 包含与账号相关的所有文本
 */
module.exports = {
  // 账号登录
  login: {
    title: '账号登录',
    username: '用户名',
    password: '密码',
    submit: '登录',
    success: '登录成功',
    failed: '登录失败，用户名或密码错误',
    accountLocked: '账号已锁定，请联系管理员'
  },
  
  // 账号注册
  register: {
    title: '账号注册',
    username: '用户名',
    password: '密码',
    confirmPassword: '确认密码',
    email: '邮箱',
    mobile: '手机号',
    submit: '注册',
    success: '注册成功',
    failed: '注册失败',
    usernameExists: '用户名已存在',
    emailExists: '邮箱已存在',
    mobileExists: '手机号已存在',
    passwordMismatch: '两次输入的密码不一致'
  },
  
  // 其他账号相关翻译...
};
```

## 使用示例

### 在控制器中使用

```js
const i18n = require('../utils/i18n.util');
const responseUtil = require('../utils/response.util');

async function login(req, res) {
  try {
    // ... 登录逻辑 ...
    
    // 登录成功
    return responseUtil.success(
      res, 
      { token: 'xxx' }, 
      i18n.t('account.login.success', req.lang)
    );
  } catch (error) {
    // 登录失败
    return responseUtil.badRequest(
      res, 
      i18n.t('account.login.failed', req.lang)
    );
  }
}
```

### 在路由注释中使用

```js
/**
 * @route POST /api/account/login
 * @desc 用户登录 (zh-CN) / User Login (en-US)
 * @access Public
 */
router.post('/login', accountController.login);
```

### 在路由字段校验中使用

在Express路由中使用validator进行参数校验时，可以结合i18n工具函数实现多语言错误提示：

```js
const express = require('express');
const { query } = require('express-validator');
const accountController = require('../controllers/account.controller');
const validatorUtil = require('../utils/validator.util');
const i18n = require('../utils/i18n.util');

const router = express.Router();

// 创建一个动态获取错误消息的方法
const getErrorMessage = (key) => (req) => {
  return i18n.t(`account.validation.${key}`, req.lang || 'zh-CN');
};

router.get(
  '/',
  [
    query('keyword')
      .optional()
      .isString()
      .withMessage(getErrorMessage('keywordString')),
    query('account')
      .optional()
      .isString()
      .withMessage(getErrorMessage('accountString')),
    query('channelId')
      .optional()
      .isInt()
      .withMessage(getErrorMessage('channelIdInt')),
    query('accountAuditStatus')
      .optional()
      .isIn(['pending', 'approved', 'rejected'])
      .withMessage(getErrorMessage('accountAuditStatusInvalid')),
    query('groupId')
      .optional()
      .isInt()
      .withMessage(getErrorMessage('groupIdInt')),
    query('memberId')
      .optional()
      .isInt()
      .withMessage(getErrorMessage('memberIdInt'))
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  accountController.getAccounts
);
```

相应的语言文件 `src/shared/i18n/zh-CN/account.js` 中需要添加：

```js
// ... existing code ...

// 字段验证错误消息
validation: {
  keywordString: '关键词必须是字符串',
  accountString: '账号必须是字符串',
  channelIdInt: '渠道ID必须是整数',
  accountAuditStatusInvalid: '账号审核状态无效',
  groupIdInt: '群组ID必须是整数',
  memberIdInt: '会员ID必须是整数'
}
```

相应的语言文件 `src/shared/i18n/en-US/account.js` 中需要添加：

```js
// ... existing code ...

// Field validation error messages
validation: {
  keywordString: 'Keyword must be a string',
  accountString: 'Account must be a string',
  channelIdInt: 'Channel ID must be an integer',
  accountAuditStatusInvalid: 'Invalid account audit status',
  groupIdInt: 'Group ID must be an integer',
  memberIdInt: 'Member ID must be an integer'
}
```

#### 修改验证工具类以支持多语言

为了更好地支持多语言验证，建议修改验证工具类 `validator.util.js`：

```js
const { validationResult } = require('express-validator');
const responseUtil = require('./response.util');
const i18n = require('./i18n.util');

/**
 * 验证请求参数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @returns {boolean} 验证是否通过
 */
function validateRequest(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return true;
  }

  const errorMessages = errors.array().map(error => error.msg);
  const lang = req.lang || 'zh-CN';
  
  responseUtil.badRequest(
    res, 
    errorMessages[0], 
    {
      errors: errorMessages,
      errorFields: errors.array().map(error => error.param)
    }
  );
  
  return false;
}

module.exports = {
  validateRequest
};
```

## 集成步骤

1. 创建所需的目录结构和文件
2. 在 `app.js` 或 `app-common.js` 中注册 i18n 中间件
3. 将现有代码中的硬编码文本替换为使用 i18n 工具函数
4. 修改响应工具类以支持多语言
5. 添加单元测试以确保多语言功能正常工作

## 注意事项

1. 确保所有返回给前端的错误消息和提示信息都使用多语言工具函数
2. 避免在代码中硬编码显示给用户的文本
3. 保持语言文件的组织整洁，按模块划分，便于维护
4. 定期检查并更新语言文件，确保翻译的完整性和准确性 