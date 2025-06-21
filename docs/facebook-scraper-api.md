# Facebook 数据抓取 API 使用文档

## 概述

本文档介绍如何使用 Facebook 数据抓取 API 来获取 Facebook 账号、帖子和群组的相关信息。

## 基础信息

- **基础 URL**: `http://your-domain.com/api/facebook`
- **内容类型**: `application/json`
- **请求方法**: 主要使用 `POST` 方法

## 技术特点

- **智能链接识别**：自动识别Facebook链接类型，无需手动指定
- **多种链接格式支持**：支持各种Facebook链接格式
- **国际化支持**：使用HTML标签和属性匹配，适用于世界各地用户
- **防反爬虫机制**：使用Playwright模拟真实浏览器行为
- **错误处理与重试**：支持自动重试和详细错误信息
- **并发控制**：批量抓取时控制并发数量，避免被封禁
- **超时控制**：可配置的超时时间和重试次数
- **多语言数字格式**：支持K/M/B、千/万/亿等多种数字格式

## API 端点列表

### 1. 数据抓取接口

#### `POST /api/facebook/scrape`

抓取 Facebook 数据的主要接口，支持自动识别链接类型。

**请求参数：**

```json
{
  "url": "https://www.facebook.com/profile.php?id=123456789",
  "type": "profile",  // 可选：profile|post|group，不提供时自动识别
  "options": {        // 可选配置
    "timeout": 30000,   // 超时时间（毫秒），默认 30000
    "retries": 3,       // 重试次数，默认 3
    "headless": true    // 是否无头模式，默认 true
  }
}
```

**响应示例：**

```json
{
  "code": 0,
  "message": "数据抓取成功",
  "data": {
    "uid": "61568498721431",
    "nickname": "用户昵称",
    "followers": 1234,
    "friends": 567,
    "profileUrl": "https://www.facebook.com/profile.php?id=61568498721431",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "个人简介",
    "_meta": {
      "type": "profile",
      "timestamp": "2025-01-XX XX:XX:XX"
    }
  }
}
```

### 2. 批量抓取接口

#### `POST /api/facebook/batch-scrape`

批量抓取多个 Facebook 链接的数据。

**请求参数：**

```json
{
  "urls": [
    "https://www.facebook.com/profile.php?id=123456789",
    {
      "url": "https://www.facebook.com/100041541093076/posts/pfbid02rxbVBt...",
      "type": "post"
    },
    "https://www.facebook.com/groups/1839013599916868/permalink/2171634433321448/"
  ],
  "options": {
    "timeout": 30000,
    "retries": 3,
    "headless": true
  }
}
```

**响应示例：**

```json
{
  "success": true,
  "message": "批量抓取完成",
  "data": [
    {
      "url": "https://www.facebook.com/profile.php?id=123456789",
      "type": "profile",
      "success": true,
      "data": {
        "uid": "123456789",
        "nickname": "用户昵称"
      }
    },
    {
      "url": "https://www.facebook.com/100041541093076/posts/pfbid02rxbVBt...",
      "type": "post",
      "success": true,
      "data": {
        "authorUid": "100041541093076",
        "authorName": "发帖人昵称"
      }
    }
  ],
  "meta": {
    "total": 3,
    "success": 2,
    "failed": 1,
    "timestamp": "2025-01-XX XX:XX:XX"
  }
}
```



## 支持的链接格式

### 个人资料链接 (Profile)
- `https://web.facebook.com/aaryn.deval`
- `https://www.facebook.com/profile.php?id=61568498721431`
- `https://www.facebook.com/share/1A3kQcXSux/`
- `https://www.facebook.com/elara.vivienne.2024`

### 帖子链接 (Post)
- `https://www.facebook.com/100041541093076/posts/pfbid02rxbVBtHYjdXVwxtvkhXCWdb6U1d9FbkQPnAuVoo3rH3XbwPRo3fF22NTa7RwR6R6l/?app=fbl`
- `https://www.facebook.com/61559834094047/posts/pfbid02YvarAcYyXnXagReumMjUBvxTMoxzrfHwW78SnMekTNd7532eZEnfYBMuymrBxvnTl/?app=fbl`
- `https://www.facebook.com/share/p/19JxQRhdoH/`

### 群组链接 (Group)
- `https://www.facebook.com/groups/1839013599916868/permalink/2171634433321448/`
- `https://www.facebook.com/share/p/16NYUHELUH/?mibextid=wwXIfr`

## 数据结构说明

### 个人资料数据 (Profile Data)
```json
{
  "uid": "用户唯一标识符",
  "nickname": "用户昵称",
  "followers": 1234,        // 粉丝数量（数字，支持K/M/B、千/万/亿格式转换）
  "friends": 567,           // 好友数量（数字，支持多种格式转换）
  "profileUrl": "原始链接",
  "avatarUrl": "头像链接",   // 可选
  "bio": "个人简介"          // 可选
}
```

**数字格式支持**：
- 英文格式：1.5K → 1500, 2.3M → 2300000, 1.2B → 1200000000
- 中文格式：5万 → 50000, 3.5万 → 35000, 1.2亿 → 120000000
- 标准格式：1,234 → 1234, 1 234 567 → 1234567

### 帖子数据 (Post Data)
```json
{
  "authorUid": "发帖人用户ID",
  "authorName": "发帖人昵称", // 可选
  "postUrl": "原始帖子链接",
  "postId": "帖子ID"        // 可选
}
```

### 群组数据 (Group Data)
```json
{
  "groupId": "群组ID",
  "groupName": "群组名称",   // 可选
  "shareUrl": "原始分享链接"
}
```

## 错误处理

### 常见错误码

- `VALIDATION_ERROR`: 请求参数验证失败
- `RATE_LIMIT_EXCEEDED`: 请求频率超限
- `SCRAPE_FAILED`: 数据抓取失败
- `INTERNAL_ERROR`: 服务器内部错误

### 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "SCRAPE_FAILED",
    "message": "数据抓取失败",
    "details": "具体错误信息"
  },
  "timestamp": "2025-01-XX XX:XX:XX"
}
```

## 使用限制

### 频率限制
- **单次抓取**: 每分钟最多 10 次请求
- **批量抓取**: 每 5 分钟最多 3 次请求
- **批量数量**: 每次批量抓取最多支持 10 个链接

### 超时设置
- **默认超时**: 60 秒
- **最小超时**: 10 秒
- **最大超时**: 180 秒

### 重试机制
- **默认重试**: 3 次
- **重试间隔**: 递增延迟（1秒、2秒、3秒）

## 使用示例

### JavaScript (Node.js)

```javascript
const axios = require('axios');

// 单个链接抓取
async function scrapeFacebookData(url, type) {
  try {
    const response = await axios.post('http://your-domain.com/api/facebook/scrape', {
      url: url,
      type: type, // 可选
      options: {
        timeout: 30000,
        retries: 3,
        headless: true
      }
    });
    
    console.log('抓取成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('抓取失败:', error.response?.data || error.message);
  }
}

// 批量抓取
async function batchScrapeFacebookData(urls) {
  try {
    const response = await axios.post('http://your-domain.com/api/facebook/batch-scrape', {
      urls: urls,
      options: {
        timeout: 30000,
        retries: 3
      }
    });
    
    console.log('批量抓取完成:', response.data);
    return response.data;
  } catch (error) {
    console.error('批量抓取失败:', error.response?.data || error.message);
  }
}

// 使用示例
scrapeFacebookData('https://www.facebook.com/profile.php?id=123456789', 'profile');

batchScrapeFacebookData([
  'https://www.facebook.com/profile.php?id=123456789',
  'https://www.facebook.com/share/p/19JxQRhdoH/',
  'https://www.facebook.com/groups/1839013599916868/permalink/2171634433321448/'
]);
```



## 注意事项

1. **合规使用**: 请确保数据抓取符合 Facebook 的使用条款和相关法律法规
2. **频率控制**: 避免过于频繁的请求，以免被 Facebook 封禁
3. **数据隐私**: 仅抓取公开信息，保护用户隐私
4. **错误处理**: 实现适当的错误处理和重试机制
5. **登录状态**: 某些内容可能需要登录状态才能访问
6. **反爬虫**: Facebook 有严格的反爬虫机制，可能需要配置代理或用户凭据

## 故障排除

### 常见问题

1. **抓取失败**: 检查网络连接和 Facebook 链接是否有效
2. **超时错误**: 增加超时时间或检查服务器性能
3. **频率限制**: 降低请求频率，遵守 API 限制
4. **验证码**: Facebook 可能要求验证码，需要人工处理
5. **登录要求**: 某些内容需要登录状态

### 调试建议

1. 使用 `headless: false` 选项查看浏览器操作
2. 检查服务器日志获取详细错误信息
3. 测试不同类型的 Facebook 链接
4. 验证请求参数格式是否正确

---

**最后更新**: 2025-01-XX  
**API 版本**: v1.0 