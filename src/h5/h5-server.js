/*
 * @Author: diaochan
 * @Date: 2025-03-15 15:43:57
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-28 20:55:21
 * @Description: 
 */
/**
 * H5端服务入口文件
 */
// 加载环境变量（放在最顶部，确保在所有模块导入前加载）
require('dotenv').config({ path: '.env' });

const createApp = require('../shared/app-common');
const { initDatabase } = require('../shared/models/db');
const h5Routes = require('./routes');
const healthRoutes = require('../shared/routes/health.routes');
const { router: sharedRoutes, setAppType } = require('../shared/routes');
const { logger } = require('../shared/config/logger.config');
const errorHandler = require('../shared/middlewares/errorHandler.middleware');
const { startScheduler } = require('../shared/services/task-scheduler.service');
const { taskStatusUpdateConfig, schedulerServiceConfig } = require('../shared/config/scheduler.config');

// 设置端口
const PORT = process.env.H5_PORT || 3001;

// 创建H5端应用
const app = createApp({
  appName: 'h5',
  corsOrigins: process.env.NODE_ENV === 'production' 
    ? ['https://m.skcpop.com', 'http://m.skcpop.com', 'https://m.skcjpy.com', 'http://m.skcjpy.com']
    : '*'
});

// 注册健康检查路由
app.use('/health', healthRoutes);

// 注册共享路由（设置应用类型为h5）
app.use(setAppType('h5'));
app.use(sharedRoutes);

// 注册H5端路由
app.use('/api/h5', h5Routes);

// 添加404处理中间件
app.use(errorHandler.notFoundHandler);

// 添加全局错误处理中间件
app.use(errorHandler.errorHandler);

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 检查数据库是否存在，如果不存在则创建
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      logger.error('数据库初始化失败，应用程序无法启动');
      process.exit(1);
    }
    
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`H5端服务已启动，监听端口 ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV}`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('开发模式: H5端API可在 http://localhost:3001/api/h5 访问');
      }
      
      // 仅当配置指定H5服务负责定时任务时才启动
      const currentService = 'h5';
      if (schedulerServiceConfig.taskStatusUpdateService === currentService) {
        // 启动任务状态更新定时任务
        const env = process.env.NODE_ENV || 'development';
        const schedulerConfig = taskStatusUpdateConfig[env] || taskStatusUpdateConfig.development;
        
        startScheduler(schedulerConfig);
        logger.info(`已启动任务状态更新定时任务，环境: ${env}，调度周期: ${schedulerConfig.schedule}`);
      } else {
        logger.info(`任务状态更新定时任务配置为在 ${schedulerServiceConfig.taskStatusUpdateService} 服务中运行，不在此实例中启动`);
      }
    });
  } catch (error) {
    logger.error(`启动H5端服务失败: ${error.message}`);
    process.exit(1);
  }
}

// 设置关闭处理程序
setupShutdownHandlers();

// 启动服务器
startServer();

// 设置关闭处理程序
function setupShutdownHandlers() {
  const FacebookScraperController = require('../shared/controllers/facebook-scraper.controller');
  
  /**
   * 优雅关闭处理函数
   * @param {string} signal - 接收到的信号
   */
  async function gracefulShutdown(signal) {
    logger.info(`[H5-SERVER] 接收到 ${signal} 信号，开始优雅关闭...`);
    
    try {
      // 关闭 Facebook 抓取服务池
      if (FacebookScraperController.serviceManager) {
        await FacebookScraperController.serviceManager.shutdownAll();
      }
      
      logger.info('[H5-SERVER] 应用程序已优雅关闭');
      process.exit(0);
    } catch (error) {
      logger.error('[H5-SERVER] 优雅关闭过程中发生错误:', error);
      process.exit(1);
    }
  }
  
  // 监听进程信号
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // 监听未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('[H5-SERVER] 未捕获的异常:', error);
    gracefulShutdown('uncaughtException');
  });
  
  // 监听未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[H5-SERVER] 未处理的 Promise 拒绝:', reason);
    gracefulShutdown('unhandledRejection');
  });
  
  logger.info('[H5-SERVER] 优雅关闭处理程序已设置');
}