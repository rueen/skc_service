# 枚举常量接口实现文档

## 接口描述

实现一个通过传入 key 获取对应常量的接口，用于前端获取系统中定义的各类枚举值。

- **接口路径**: `/api/enums/:enumType`
- **请求方法**: `GET`
- **功能说明**: 根据传入的枚举类型名称，返回对应的枚举常量数据

## 请求参数

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|-----|------|------|
| enumType | String | 是 | 枚举类型名称，如 `TaskStatus`、`TaskType` 等 |

### 查询参数

| 参数名 | 类型 | 必填 | 说明 |
|-------|-----|------|------|
| lang | String | 否 | 语言代码，默认为 `zh-CN`，可选值：`zh-CN`、`en-US` |

## 响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 返回的枚举数据，格式根据枚举类型不同而不同
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "枚举类型不存在"
}
```

## 实现要点

1. 在后端维护与前端相同的枚举定义
2. 支持按需返回指定语言的文本
3. 提供完整的枚举数据，包括枚举值和对应的多语言文本

## 后端实现示例 (Node.js + Express)

```javascript
// enums.js - 后端枚举定义
const TaskStatus = {
  NOT_STARTED: 'not_started',
  PROCESSING: 'processing',
  ENDED: 'ended'
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

// 其他枚举定义...
const TaskType = {
  IMAGE_TEXT: 'image_text',
  VIDEO: 'video'
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

// 导出所有枚举
module.exports = {
  TaskStatus,
  TaskStatusLang,
  TaskType,
  TaskTypeLang,
  // 其他枚举...
};
```

```javascript
// enumController.js - 枚举接口控制器
const enums = require('./enums');

/**
 * 获取枚举常量
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getEnum = (req, res) => {
  const { enumType } = req.params;
  const lang = req.query.lang || 'zh-CN';
  
  // 检查枚举类型是否存在
  if (!enums[enumType]) {
    return res.status(400).json({
      code: 400,
      message: '枚举类型不存在'
    });
  }
  
  // 获取枚举值
  const enumValues = enums[enumType];
  
  // 获取对应的语言配置
  const langConfig = enums[`${enumType}Lang`];
  
  // 如果没有语言配置，直接返回枚举值
  if (!langConfig) {
    return res.json({
      code: 0,
      message: 'success',
      data: enumValues
    });
  }
  
  // 构建返回数据，包含枚举值和对应的语言文本
  const result = {};
  
  Object.keys(enumValues).forEach(key => {
    const value = enumValues[key];
    result[key] = {
      value,
      text: langConfig[value]?.[lang] || value
    };
  });
  
  res.json({
    code: 0,
    message: 'success',
    data: result
  });
};

module.exports = {
  getEnum
};
```

```javascript
// routes.js - 路由配置
const express = require('express');
const router = express.Router();
const enumController = require('./enumController');

// 枚举接口路由
router.get('/enums/:enumType', enumController.getEnum);

module.exports = router;
```

```javascript
// app.js - 应用入口
const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// 注册路由
app.use('/api', routes);

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

## 接口使用示例

### 请求示例

```
GET /api/enums/TaskStatus?lang=zh-CN
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "NOT_STARTED": {
      "value": "not_started",
      "text": "未开始"
    },
    "PROCESSING": {
      "value": "processing",
      "text": "进行中"
    },
    "ENDED": {
      "value": "ended",
      "text": "已结束"
    }
  }
}
```

## 前端调用示例

```javascript
import { request } from '@/utils/request';

// 获取任务状态枚举
const getTaskStatusEnum = async (lang = 'zh-CN') => {
  try {
    const res = await request('system.enum', {}, {
      urlParams: { enumType: 'TaskStatus' },
      params: { lang }
    });
    return res.data;
  } catch (error) {
    console.error('获取枚举失败:', error);
    return {};
  }
};
```

## 注意事项

1. 确保前后端枚举定义保持一致，建议使用代码生成工具或共享模块
2. 考虑缓存常用枚举数据，减少请求次数
3. 对于大型应用，可以考虑一次性返回所有枚举，或者按模块分组返回
4. 确保接口有适当的错误处理和日志记录
5. 考虑添加接口版本控制，以便未来枚举变更时能够平滑过渡 