# h5端登录功能后端实现文档

## 概述

本文档描述了前端登录功能所需的后端API实现要求。登录功能支持手机号和邮箱两种登录方式，并且对未注册用户自动进行注册。
数据库表使用已有的 members 表

## API

### 用户登录

#### 请求

```
POST /api/auth/login
```

#### 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|-------|-----|------|------|
| loginType | string | 是 | 登录类型：'phone'或'email' |
| memberAccount | string | 条件必填 | 账号 |
| areaCode | string | 否 | 国际区号（默认为'86'） |
| password | string | 是 | 密码 |

#### 响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 10001,
      "nickname": "用户昵称",
      "avatar": "https://example.com/avatar.jpg",
      "loginType": "phone",
      "memberAccount": "13800138000"
    }
  }
}
```

### 2. 获取用户信息接口

#### 请求

```
GET /api/user/info
```

#### 请求头

```
Authorization: Bearer {token}
```

#### 响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 10001,
    "nickname": "用户昵称",
    "avatar": "https://example.com/avatar.jpg",
    "loginType": "phone",
    "memberAccount": "13800138000"
  }
}
```

### 3. 退出登录接口

#### 请求

```
POST /api/auth/logout
```

#### 请求头

```
Authorization: Bearer {token}
```

#### 响应

```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

## 后端实现要求

### 1. 登录流程

1. 接收前端传来的登录信息（手机号/邮箱和密码）
2. 根据登录类型（手机号/邮箱）查询数据库中是否存在该用户
3. 如果用户存在：
   - 使用bcrypt验证密码是否正确
   - 密码正确则生成JWT token并返回用户信息
   - 密码错误则返回错误信息
4. 如果用户不存在：
   - 自动创建新用户（使用bcrypt对密码进行哈希处理）
   - 生成JWT token并返回用户信息

### 2. 密码处理

使用bcrypt进行密码哈希和验证：

```javascript
// 密码哈希示例
const bcrypt = require('bcrypt');
const saltRounds = 10;

// 哈希密码
const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

// 验证密码
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
```

### 3. JWT Token处理

```javascript
// JWT token生成示例
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d'; // token有效期7天

// 生成token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// 验证token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};
```

### 4. 手机号区号处理

1. 前端传入区号（如'86'）和手机号
2. 后端存储时将区号和手机号分开存储
3. 查询时需要同时匹配区号和手机号

### 6. 安全措施

1. 使用HTTPS协议传输数据
2. 实现登录频率限制，防止暴力破解
3. 密码不明文传输和存储
4. 敏感信息（如手机号、邮箱）在返回前进行脱敏处理

## 接口测试用例

### 1. 手机号登录测试

```
POST /api/auth/login
Content-Type: application/json

{
  "loginType": "phone",
  "memberAccount": "13800138000",
  "areaCode": "86",
  "password": "password123"
}
```

### 2. 邮箱登录测试

```
POST /api/auth/login
Content-Type: application/json

{
  "loginType": "email",
  "memberAccount": "user@example.com",
  "password": "password123"
}
```

### 3. 自动注册测试

使用未注册的手机号或邮箱进行登录，系统应自动创建新用户并返回登录成功。

### 注意事项

#### 安全要求
- API路由保护
- CORS 配置
- 防止 SQL 注入攻击
- 对接口限流，添加接口访问频率限制，防止恶意请求和服务器过载

#### 其他要求
- 为所有接口添加统一的错误处理机制
- 遵循 RESTful API 设计原则
- 为这个项目中的所有代码写上详细注释
- 充分考虑安全因素
- 敏感操作需要记录日志
- 考虑国际化支持，错误信息应支持多语言
- 接口返回统一使用JSON格式

#### 命名规范
- 数据库表字段：使用下划线命名法（snake_case）
  - 例如：create_time、update_time、last_login_time
- API 响应字段：使用驼峰命名法（camelCase）
  - 例如：createTime、updateTime、lastLoginTime