/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:10:51
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-24 16:21:58
 * @Description: 
 */
/**
 * 日志配置文件
 * 使用winston配置日志记录
 */
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');
require('winston-daily-rotate-file');
const OssTransport = require('../utils/winston-oss-transport');

// 自定义日志格式
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// 日志目录路径
const logDirectory = path.join(process.cwd(), 'logs');

// 日志轮换配置
const fileRotateTransportOptions = {
  dirname: logDirectory,
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  zippedArchive: true,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  )
};

// 创建日志记录器配置
const loggerTransports = [
  // 控制台输出
  new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    )
  }),
  // 错误日志文件 - 使用日志轮换
  new transports.DailyRotateFile({
    ...fileRotateTransportOptions,
    filename: 'error-%DATE%.log',
    level: 'error'
  }),
  // 所有日志文件 - 使用日志轮换
  new transports.DailyRotateFile({
    ...fileRotateTransportOptions,
    filename: 'combined-%DATE%.log'
  })
];

// 抓取失败日志配置
const scrapeFailureTransports = [
  // 本地文件存储
  new transports.DailyRotateFile({
    ...fileRotateTransportOptions,
    filename: 'scrape-failures-%DATE%.log',
    format: format.printf(info => info.message) // 只输出消息内容，不加时间戳等格式
  })
];

// 抓取成功日志配置
const scrapeSuccessTransports = [
  // 本地文件存储
  new transports.DailyRotateFile({
    ...fileRotateTransportOptions,
    filename: 'scrape-success-%DATE%.log',
    format: format.printf(info => info.message) // 只输出消息内容，不加时间戳等格式
  })
];

// 只在生产环境(NODE_ENV=production)且配置了OSS相关环境变量时，添加OSS传输器
if (process.env.NODE_ENV === 'production' && 
    process.env.OSS_ACCESS_KEY_ID && 
    process.env.OSS_ACCESS_KEY_SECRET && 
    process.env.OSS_REGION) {
  // 添加OSS传输器 - 所有日志
  loggerTransports.push(
    new OssTransport({
      level: 'info',
      bucket: 'skc-logs',
      ossPrefix: 'logs/combined/'
    })
  );
  
  // 添加OSS传输器 - 错误日志
  loggerTransports.push(
    new OssTransport({
      level: 'error',
      bucket: 'skc-logs',
      ossPrefix: 'logs/error/'
    })
  );
  
  // 添加OSS传输器 - 抓取失败日志
  scrapeFailureTransports.push(
    new OssTransport({
      level: 'info',
      bucket: 'skc-logs',
      ossPrefix: 'logs/scrape/'
    })
  );
  
  // 添加OSS传输器 - 抓取成功日志
  scrapeSuccessTransports.push(
    new OssTransport({
      level: 'info',
      bucket: 'skc-logs',
      ossPrefix: 'logs/scrape/'
    })
  );
  
  console.log('已启用OSS日志存储，日志将上传至阿里云OSS');
} else {
  console.log('仅启用本地日志存储，日志将保存在本地文件系统');
}

// 创建日志记录器
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: loggerTransports
});

// 创建抓取失败专用记录器
const scrapeFailureLogger = createLogger({
  level: 'info',
  transports: scrapeFailureTransports,
  format: format.printf(info => info.message) // 只输出消息内容
});

// 创建抓取成功专用记录器
const scrapeSuccessLogger = createLogger({
  level: 'info',
  transports: scrapeSuccessTransports,
  format: format.printf(info => info.message) // 只输出消息内容
});

module.exports = {
  logger,
  scrapeFailureLogger,
  scrapeSuccessLogger
}; 