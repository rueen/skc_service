/*
 * @Author: diaochan
 * @Date: 2025-03-15 15:44:59
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-18 09:08:43
 * @Description: 
 */
/**
 * 共享的应用配置文件
 * 包含通用的中间件和配置
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const FileStreamRotator = require('file-stream-rotator');
const i18nMiddleware = require('./middlewares/i18n.middleware');

/**
 * 创建一个配置好的Express应用
 * @param {Object} options - 配置选项
 * @param {string} options.appName - 应用名称 ('admin' 或 'h5')
 * @param {Array} options.corsOrigins - CORS允许的源
 * @returns {Object} Express应用实例
 */
function createApp(options = {}) {
  const { appName = 'app', corsOrigins = '*' } = options;
  
  // 创建Express应用
  const app = express();
  // 设置trust proxy，因为应用运行在反向代理（如Nginx）后面
  app.set("trust proxy", 1);

  
  // 安全中间件
  app.use(helmet());
  
  // 国际化中间件，提前到请求体解析之前，以便尽早设置语言
  app.use(i18nMiddleware);
  
  // CORS配置
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? corsOrigins 
      : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true
  }));
  
  // 请求体解析
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 静态文件服务
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(path.join(process.cwd(), 'uploads')));
  
  // 日志中间件
  // 确保日志目录存在
  const logDirectory = path.join(process.cwd(), 'logs');
  fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
  
  // 根据环境配置日志
  if (process.env.NODE_ENV === 'production') {
    // 在生产环境中使用日志轮换
    const accessLogStream = FileStreamRotator.getStream({
      date_format: 'YYYY-MM-DD',
      filename: path.join(logDirectory, `${appName}-access-%DATE%.log`),
      frequency: 'daily',
      verbose: false,
      max_logs: '14d',
      size: '20m'
    });
    
    app.use(morgan('combined', { stream: accessLogStream }));
  } else {
    // 在开发环境中使用dev格式并输出到控制台
    app.use(morgan('dev'));
  }
  
  // 注意：不在这里注册404和错误处理中间件
  // 让调用者可以先注册自己的路由
  
  return app;
}

module.exports = createApp; 
