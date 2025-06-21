# Facebook 数据抓取需求文档

## 项目概述

本文档描述了基于 Playwright 实现的 Facebook 数据抓取功能需求，通过统一的 API 接口支持多种类型的 Facebook 链接数据提取。

## 功能需求

### 1. Facebook 账号主页信息抓取

**功能描述：** 根据用户输入的 Facebook 账号主页链接，抓取账号的基本信息。

**输入：** Facebook 账号主页链接

**输出：** uid、昵称、粉丝数量、好友数量等信息

**支持的链接格式：**
- `https://web.facebook.com/aaryn.deval`
- `https://www.facebook.com/profile.php?id=61568498721431`
- `https://www.facebook.com/share/1A3kQcXSux/`
- `https://www.facebook.com/elara.vivienne.2024`

### 2. Facebook 帖子链接信息抓取

**功能描述：** 根据用户输入的 Facebook 帖子链接，抓取发帖账号的 uid 信息。

**输入：** Facebook 帖子链接

**输出：** 发帖账号的 uid 信息

**支持的链接格式：**
- `https://www.facebook.com/100041541093076/posts/pfbid02rxbVBtHYjdXVwxtvkhXCWdb6U1d9FbkQPnAuVoo3rH3XbwPRo3fF22NTa7RwR6R6l/?app=fbl`
- `https://www.facebook.com/61559834094047/posts/pfbid02YvarAcYyXnXagReumMjUBvxTMoxzrfHwW78SnMekTNd7532eZEnfYBMuymrBxvnTl/?app=fbl`
- `https://www.facebook.com/share/p/19JxQRhdoH/`

### 3. Facebook 分享链接群组信息抓取

**功能描述：** 根据用户输入的 Facebook 分享链接，抓取群组 ID 信息。

**输入：** Facebook 分享链接

**输出：** 群组 ID 信息

**支持的链接格式：**
- `https://www.facebook.com/groups/1839013599916868/permalink/2171634433321448/`
- `https://www.facebook.com/share/p/16NYUHELUH/?mibextid=wwXIfr`

## 技术方案

### 技术栈选择

- **浏览器自动化工具：** Playwright
  - 选择理由：更强的反检测能力、支持多浏览器、现代化 API 设计
  - 参考文档：[Playwright 官方文档](https://playwright.dev/docs/intro)
- **运行环境：** Node.js
- **集成方式：** 集成到现有项目架构中

### 系统要求

根据 [Playwright 系统要求](https://playwright.dev/docs/intro)：
- Node.js 18, 20 或 22 最新版本
- macOS 14 Ventura 或更高版本
- 支持 Chromium, WebKit, 和 Firefox 浏览器引擎

## API 设计

### 统一接口设计

**接口路径：** `POST /api/facebook/scrape`

**请求参数：**
```json
{
  "type": "profile|post|group",
  "url": "Facebook链接",
  "options": {
    "timeout": 30000,
    "retries": 3,
    "headless": true
  }
}
```

**参数说明：**
- `type`: 数据类型，必填
  - `profile`: 账号主页信息
  - `post`: 帖子信息
  - `group`: 群组信息
- `url`: Facebook 链接，必填
- `options`: 可选配置参数
  - `timeout`: 超时时间（毫秒），默认 30000
  - `retries`: 重试次数，默认 3
  - `headless`: 是否无头模式，默认 true

### 响应格式

#### 账号信息响应
```json
{
  "success": true,
  "type": "profile",
  "data": {
    "uid": "61568498721431",
    "nickname": "用户昵称",
    "followers": 1234,
    "friends": 567,
    "profileUrl": "原始链接",
    "avatarUrl": "头像链接",
    "bio": "个人简介"
  },
  "timestamp": "2025-01-XX XX:XX:XX"
}
```

#### 帖子信息响应
```json
{
  "success": true,
  "type": "post",
  "data": {
    "authorUid": "100041541093076",
    "authorName": "发帖人昵称",
    "postUrl": "原始链接",
    "postId": "帖子ID"
  },
  "timestamp": "2025-01-XX XX:XX:XX"
}
```

#### 群组信息响应
```json
{
  "success": true,
  "type": "group",
  "data": {
    "groupId": "1839013599916868",
    "groupName": "群组名称",
    "shareUrl": "原始链接"
  },
  "timestamp": "2025-01-XX XX:XX:XX"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "无效的Facebook链接",
    "details": "具体错误信息"
  },
  "timestamp": "2025-01-XX XX:XX:XX"
}
```

## 链接类型识别策略

### 自动识别规则

1. **账号主页链接识别：**
   - 包含 `/profile.php?id=` 的链接
   - 形如 `facebook.com/用户名` 的链接（不含特殊关键词）
   - `web.facebook.com/用户名` 格式

2. **帖子链接识别：**
   - 包含 `/posts/` 的链接
   - 包含 `/share/p/` 且无群组相关参数的链接

3. **群组链接识别：**
   - 包含 `/groups/` 的链接
   - 包含 `mibextid` 参数的分享链接

### 特殊情况处理

**歧义链接处理：**
- `https://www.facebook.com/share/p/` 格式既可能是帖子也可能是群组分享
- 解决方案：
  1. 优先通过 URL 参数判断（如 `mibextid=wwXIfr` 表示群组）
  2. 访问页面后通过页面内容判断
  3. 允许用户通过 `type` 参数强制指定类型

## 技术挑战与解决方案

### 1. Facebook 反爬虫机制
**挑战：** Facebook 有严格的反爬虫检测
**解决方案：**
- 使用 Playwright 的反检测功能
- 随机化用户代理和浏览器指纹
- 控制访问频率和添加随机延时
- 模拟真实用户行为

### 2. 登录要求
**挑战：** 部分内容需要登录才能访问
**解决方案：**
- 优先抓取公开可访问的信息
- 支持配置登录凭据（可选）
- 提供登录状态管理

### 3. 动态内容加载
**挑战：** Facebook 大量使用 JavaScript 动态加载内容
**解决方案：**
- 利用 Playwright 的自动等待机制
- 设置合适的等待条件和超时时间
- 处理异步加载的数据

### 4. 链接格式多样性
**挑战：** Facebook 链接格式复杂多样
**解决方案：**
- 实现智能链接解析和标准化
- 支持重定向链接处理
- 提供链接格式验证

## 实现计划

### 阶段一：基础框架搭建
1. 安装和配置 Playwright
2. 创建基础的 API 路由结构
3. 实现链接类型识别逻辑

### 阶段二：核心功能实现
1. 实现账号主页信息抓取
2. 实现帖子信息抓取
3. 实现群组信息抓取

### 阶段三：优化和完善
1. 添加错误处理和重试机制
2. 实现反检测措施
3. 性能优化和测试

### 阶段四：部署和维护
1. 部署到生产环境
2. 监控和日志记录
3. 定期维护和更新

## 注意事项

1. **合规性：** 确保数据抓取符合 Facebook 的使用条款和相关法律法规
2. **频率限制：** 控制请求频率，避免被封禁
3. **数据隐私：** 仅抓取公开信息，保护用户隐私
4. **稳定性：** Facebook 页面结构可能变化，需要定期维护和更新
5. **错误处理：** 完善的错误处理和用户反馈机制

## 参考资料

- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [Facebook 开发者政策](https://developers.facebook.com/policy)
- [Node.js 最佳实践](https://nodejs.org/en/docs/guides)

---

**文档版本：** v1.0  
**创建日期：** 2025-01-XX  
**最后更新：** 2025-01-XX  
**维护人员：** 开发团队 