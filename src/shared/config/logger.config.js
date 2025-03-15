/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:10:51
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-15 18:39:37
 * @Description: 
 */
/**
 * 日志配置文件
 * 使用winston配置日志记录
 */
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');

// 自定义日志格式
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// 日志目录路径
const logDirectory = path.join(process.cwd(), 'logs');

// 创建日志记录器
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // 控制台输出
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    // 错误日志文件
    new transports.File({ 
      filename: path.join(logDirectory, 'error.log'), 
      level: 'error' 
    }),
    // 所有日志文件
    new transports.File({ 
      filename: path.join(logDirectory, 'combined.log') 
    })
  ]
});

module.exports = logger; 