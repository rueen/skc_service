# AI代理使用指南

## 项目概述

这是一个基于Node.js的社交营销协作服务平台，分为Support端（管理后台）和H5端（用户前端）两个服务。在处理与此项目相关的需求时，请遵循以下指南。

## 代理工作流程

1. **理解需求**
   - 确定需求属于哪个服务端（Support端或H5端）
   - 识别涉及的数据模型和业务规则
   - 明确需求的API路径和HTTP方法

2. **代码探索**
   - 按照项目结构查找相关文件
   - 理解现有实现逻辑
   - 关注枚举值和常量的使用

3. **实现方案**
   - 遵循现有代码风格和命名规范
   - 保持代码结构一致性
   - 实现业务逻辑并添加必要注释

## 处理常见需求类型

### 1. 创建新API接口

1. 确定API属于哪个服务端：
   - Support端: `/api/support/...`
   - H5端: `/api/h5/...`

2. 在相应的路由文件中添加路由定义
   ```javascript
   // 示例: src/admin/routes/task.routes.js
   router.post('/tasks', taskController.create);
   ```

3. 在相应的控制器中实现处理逻辑
   ```javascript
   // 示例: src/admin/controllers/task.controller.js
   async function create(req, res, next) {
     try {
       // 实现逻辑
     } catch (error) {
       next(error);
     }
   }
   ```

4. 如需，在模型文件中添加数据访问方法
   ```javascript
   // 示例: src/shared/models/task.model.js
   async function create(taskData) {
     // 实现数据访问逻辑
   }
   ```

### 2. 修改现有功能

1. 找到相关路由和控制器
2. 理解现有实现
3. 适当修改，保持兼容性
4. 考虑添加日志记录变更

### 3. 数据库变更

1. 创建迁移脚本
2. 更新模型文件
3. 确保数据一致性

## 特殊注意事项

1. **数据库字段命名**
   - 数据库表字段使用下划线命名法 (snake_case)
   - 在API响应和模型层转换为驼峰命名法 (camelCase)

2. **错误处理**
   - 使用try-catch包裹异步代码
   - 将错误传递给错误处理中间件

3. **数据验证**
   - 在路由层进行请求数据验证
   - 使用中间件进行权限验证

4. **多语言支持**
   - 检查是否需要为新增常量添加多语言支持

## 路径指南

```
src/
├── admin/                # Support端（管理后台）代码
│   ├── admin-server.js   # 管理后台服务入口文件
│   ├── controllers/      # 控制器目录
│   ├── routes/           # 路由目录
│   └── middlewares/      # 中间件目录
├── h5/                   # H5端（用户前端）代码
│   ├── h5-server.js      # H5端服务入口文件
│   ├── controllers/      # 控制器目录
│   ├── routes/           # 路由目录
│   └── middlewares/      # 中间件目录
└── shared/               # 共享代码
    ├── models/           # 数据模型
    ├── config/           # 配置文件
    ├── routes/           # 共享路由
    ├── controllers/      # 共享控制器
    ├── middlewares/      # 共享中间件
    ├── utils/            # 工具函数
    └── app-common.js     # 应用程序通用配置
```

## 响应格式

保持统一的响应格式:

```javascript
// 成功响应
res.json({
  code: 200,
  data: result,
  message: '操作成功'
});

// 错误响应
res.status(400).json({
  code: 400,
  message: '错误信息'
});
```

## 常用枚举值

使用`src/shared/config/enums.js`中定义的枚举常量:

```javascript
const { TaskStatus } = require('../../shared/config/enums');

// 使用示例
if (task.status === TaskStatus.PROCESSING) {
  // ...
}
```

## 代码提交规范

1. 功能开发: `feat: 添加会员邀请功能`
2. 错误修复: `fix: 修复任务状态更新错误`
3. 重构代码: `refactor: 重构任务控制器` 
4. 文档更新: `docs: 更新API文档`

遵循以上指南，将帮助您更高效地处理与该项目相关的需求。 