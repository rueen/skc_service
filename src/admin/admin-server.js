/*
 * @Author: diaochan
 * @Date: 2025-03-25 10:15:13
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-24 16:18:06
 * @Description: 
 */
// 加载环境变量（放在最顶部，确保在所有模块导入前加载）
require('dotenv').config({ path: '.env' });

const createApp = require('../shared/app-common');
const { initDatabase } = require('../shared/models/db');
const { initTables } = require('../shared/models/init.db');
const adminRoutes = require('./routes');
const healthRoutes = require('../shared/routes/health.routes');
const { router: sharedRoutes, setAppType } = require('../shared/routes');
const { logger } = require('../shared/config/logger.config');
const errorHandler = require('../shared/middlewares/errorHandler.middleware');
const { startScheduler } = require('../shared/services/task-scheduler.service');
const { startLogCleanupScheduler } = require('../shared/services/log-cleaner.service');
const { taskStatusUpdateConfig, schedulerServiceConfig } = require('../shared/config/scheduler.config');

// 设置服务器端口
const PORT = process.env.ADMIN_PORT;

// 创建管理后台应用
const app = createApp({
  appName: 'admin',
  corsOrigins: process.env.NODE_ENV === 'production' 
    ? ['https://support.skcpop.com', 'http://support.skcpop.com'] 
    : '*'
});

// 注册健康检查路由
app.use('/health', healthRoutes);

// 注册共享路由（设置应用类型为admin）
app.use(setAppType('admin'));
app.use(sharedRoutes);

// 注册管理后台路由
app.use('/api/admin', adminRoutes);

// 添加404处理中间件
app.use(errorHandler.notFoundHandler);

// 添加全局错误处理中间件
app.use(errorHandler.errorHandler);

// 注册关闭时的清理逻辑
setupShutdownHandlers(app);

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 检查数据库是否存在，如果不存在则创建
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
      logger.info(`管理后台服务器启动成功`);
      logger.info(`端口: ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV}`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('开发模式: 管理后台API可在 http://localhost:3002/api/admin 访问');
      }
      
      // 仅当配置指定管理后台服务负责定时任务时才启动
      const currentService = 'admin';
      if (schedulerServiceConfig.taskStatusUpdateService === currentService) {
        // 启动任务状态更新定时任务
        const env = process.env.NODE_ENV || 'development';
        const schedulerConfig = taskStatusUpdateConfig[env] || taskStatusUpdateConfig.development;
        
        logger.info(`尝试启动任务状态定时更新服务，环境: ${env}，调度表达式: ${schedulerConfig.schedule}`);
        try {
          const scheduler = startScheduler(schedulerConfig);
          if (scheduler) {
            logger.info(`✅ 任务状态更新定时任务已成功启动，环境: ${env}，调度周期: ${schedulerConfig.schedule}`);
          } else {
            logger.error(`❌ 任务状态更新定时任务启动失败`);
          }
        } catch (error) {
          logger.error(`❌ 任务状态更新定时任务启动时发生错误: ${error.message}`);
        }
        
        // 启动日志清理定时任务
        const logCleanupSchedulerConfig = require('../shared/config/scheduler.config').logCleanupConfig[env] || 
                                         require('../shared/config/scheduler.config').logCleanupConfig.development;
        
        logger.info(`尝试启动日志清理定时任务，环境: ${env}，调度表达式: ${logCleanupSchedulerConfig.schedule}`);
        
        const logCleanupScheduler = startLogCleanupScheduler(logCleanupSchedulerConfig);
        
        if (logCleanupScheduler) {
          logger.info(`✅ 日志清理定时任务已成功启动，环境: ${env}，调度周期: ${logCleanupSchedulerConfig.schedule}`);
        } else {
          logger.error(`❌ 日志清理定时任务启动失败`);
        }
      } else {
        logger.info(`任务状态更新定时任务配置为在 ${schedulerServiceConfig.taskStatusUpdateService} 服务中运行，不在此实例中启动`);
      }
      
      // 初始化支付交易监控任务
      const paymentTransactionMonitor = require('../shared/services/payment-transaction-monitor.js');
      paymentTransactionMonitor.initTasks();
    });
  } catch (error) {
    logger.error(`启动管理后台服务失败: ${error.message}`);
    process.exit(1);
  }
}

// 启动服务器
startServer();

// 设置关闭处理程序
function setupShutdownHandlers(app) {
  const FacebookScraperController = require('../shared/controllers/facebook-scraper.controller');
  
  /**
   * 优雅关闭处理函数
   * @param {string} signal - 接收到的信号
   */
  async function gracefulShutdown(signal) {
    logger.info(`[ADMIN-SERVER] 接收到 ${signal} 信号，开始优雅关闭...`);
    
    try {
      // 关闭 Facebook 抓取服务池
      if (FacebookScraperController.serviceManager) {
        await FacebookScraperController.serviceManager.shutdownAll();
      }
      
      logger.info('[ADMIN-SERVER] 应用程序已优雅关闭');
      process.exit(0);
    } catch (error) {
      logger.error('[ADMIN-SERVER] 优雅关闭过程中发生错误:', error);
      process.exit(1);
    }
  }
  
  // 监听进程信号
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // 监听未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('[ADMIN-SERVER] 未捕获的异常:', error);
    gracefulShutdown('uncaughtException');
  });
  
  // 监听未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('[ADMIN-SERVER] 未处理的 Promise 拒绝:', reason);
    gracefulShutdown('unhandledRejection');
  });
  
  logger.info('[ADMIN-SERVER] 优雅关闭处理程序已设置');
} 