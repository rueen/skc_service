/**
 * H5端服务入口文件
 */
const createApp = require('../shared/app-common');
const { initDatabase } = require('../shared/models/db');
const h5Routes = require('./routes');
const healthRoutes = require('../shared/routes/health.routes');
const logger = require('../shared/config/logger.config');
const errorHandler = require('../shared/middlewares/errorHandler.middleware');

// 加载环境变量
require('dotenv').config({ path: '.env.h5' });

// 设置端口
const PORT = process.env.H5_PORT || 3001;

// 创建H5端应用
const app = createApp({
  appName: 'h5',
  corsOrigins: process.env.NODE_ENV === 'production' 
    ? ['https://h5.example.com'] 
    : '*'
});

// 注册健康检查路由
app.use('/health', healthRoutes);

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
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
      
      if (process.env.NODE_ENV !== 'production') {
        logger.info('开发模式: H5端API可在 http://localhost:3001/api/h5 访问');
      }
    });
  } catch (error) {
    logger.error(`启动H5端服务失败: ${error.message}`);
    process.exit(1);
  }
}

// 启动服务器
startServer(); 