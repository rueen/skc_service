/**
 * 应用程序入口文件
 * 配置和启动Express服务器
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./models/db');
const { initTables } = require('./models/init.db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const logger = require('./config/logger.config');

// 加载环境变量
require('dotenv').config();

// 创建Express应用
const app = express();

// 设置端口
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://admin.example.com'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 日志中间件
// 在生产环境中将日志写入文件
if (process.env.NODE_ENV === 'production') {
  // 确保日志目录存在
  const logDirectory = path.join(__dirname, 'logs');
  fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
  
  // 创建日志写入流
  const accessLogStream = fs.createWriteStream(
    path.join(logDirectory, 'access.log'),
    { flags: 'a' }
  );
  
  // 使用combined格式并写入文件
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  // 在开发环境中使用dev格式并输出到控制台
  app.use(morgan('dev'));
}

// 注册路由
app.use(routes);

// 404处理
app.use(errorHandler.notFoundHandler);

// 全局错误处理
app.use(errorHandler.errorHandler);

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 初始化数据库
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      logger.error('数据库初始化失败，应用程序无法启动');
      process.exit(1);
    }
    
    // 初始化数据库表
    const tablesInitialized = await initTables();
    if (!tablesInitialized) {
      logger.error('数据库表初始化失败，应用程序无法启动');
      process.exit(1);
    }
    
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器已启动，监听端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('开发模式: API文档可在 http://localhost:3001/api/support 访问');
      }
    });
  } catch (error) {
    logger.error(`启动服务器失败: ${error.message}`);
    process.exit(1);
  }
}

// 启动服务器
startServer(); 