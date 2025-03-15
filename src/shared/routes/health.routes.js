/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:09:37
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-15 16:26:29
 * @Description: 
 */
const express = require('express');
const router = express.Router();
const db = require('../models/db');

/**
 * @api {get} /health 健康检查
 * @apiName HealthCheck
 * @apiGroup System
 * @apiDescription 检查API服务和数据库连接的健康状态
 *
 * @apiSuccess {String} status 服务状态
 * @apiSuccess {Object} db 数据库连接状态
 * @apiSuccess {String} timestamp 当前时间戳
 * @apiSuccess {String} uptime 服务运行时间
 * @apiSuccess {Object} memory 内存使用情况
 *
 * @apiSuccessExample {json} 成功响应:
 *     HTTP/1.1 200 OK
 *     {
 *       "status": "ok",
 *       "db": {
 *         "status": "connected"
 *       },
 *       "timestamp": "2023-05-20T12:34:56.789Z",
 *       "uptime": "1d 2h 3m 4s",
 *       "memory": {
 *         "rss": "50MB",
 *         "heapTotal": "20MB",
 *         "heapUsed": "15MB",
 *         "external": "2MB"
 *       }
 *     }
 */
router.get('/', async (req, res) => {
  try {
    // 检查数据库连接
    let dbStatus = 'disconnected';
    try {
      await db.query('SELECT 1');
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('数据库健康检查失败:', dbError);
    }

    // 格式化运行时间
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const formattedUptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // 获取内存使用情况
    const memoryUsage = process.memoryUsage();
    const formatMemory = (bytes) => `${Math.round(bytes / 1024 / 1024)}MB`;

    // 返回健康状态
    res.status(200).json({
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      db: {
        status: dbStatus
      },
      timestamp: new Date().toISOString(),
      uptime: formattedUptime,
      memory: {
        rss: formatMemory(memoryUsage.rss),
        heapTotal: formatMemory(memoryUsage.heapTotal),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        external: formatMemory(memoryUsage.external)
      }
    });
  } catch (error) {
    console.error('健康检查失败:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 