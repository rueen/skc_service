/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:10:51
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-11 11:08:11
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
  ]
});

module.exports = logger; 