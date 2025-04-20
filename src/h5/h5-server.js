/*
 * @Author: diaochan
 * @Date: 2025-03-15 15:43:57
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-20 14:41:08
 * @Description: 
 */
/**
 * H5端服务入口文件
 */
// 加载环境变量（放在最顶部，确保在所有模块导入前加载）
require('dotenv').config({ path: '.env.h5' });
// 加载通用环境变量
// require('dotenv').config({ path: '.env' });
// // 初始化环境变量配置
// require('../shared/config/env.config');

const createApp = require('../shared/app-common');
const { initDatabase } = require('../shared/models/db');
const h5Routes = require('./routes');
const healthRoutes = require('../shared/routes/health.routes');
const { router: sharedRoutes, setAppType } = require('../shared/routes');
const logger = require('../shared/config/logger.config');
const errorHandler = require('../shared/middlewares/errorHandler.middleware');
const { startScheduler } = require('../shared/services/task-scheduler.service');
const { taskStatusUpdateConfig, schedulerServiceConfig } = require('../shared/config/scheduler.config');

// 设置端口
const PORT = process.env.H5_PORT || 3001;

// 创建H5端应用
const app = createApp({
  appName: 'h5',
  corsOrigins: process.env.NODE_ENV === 'production' 
    ? ['https://m.rueen.cn', 'http://m.rueen.cn']
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

// 启动服务器
startServer();