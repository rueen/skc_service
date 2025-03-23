/**
 * 定时任务配置
 */

// 定时任务服务启用配置
// 设置哪个服务实例应该启动定时任务
const schedulerServiceConfig = {
  // 默认在管理后台(admin)服务中启动定时任务，H5端不启动
  taskStatusUpdateService: 'admin'  // 可选值: 'admin' 或 'h5'
};

// 定时更新任务状态配置
const taskStatusUpdateConfig = {
  // 开发环境配置：3分钟更新一次
  development: {
    // cron表达式：每3分钟执行一次（分钟位置为 0,3,6,9,...,57）
    schedule: '0 */3 * * * *',
    runImmediately: true
  },
  // 生产环境配置：1分钟更新一次
  production: {
    // cron表达式：每1分钟执行一次
    schedule: '0 */1 * * * *',
    runImmediately: true
  },
  // 测试环境配置：5分钟更新一次
  test: {
    // cron表达式：每5分钟执行一次
    schedule: '0 */5 * * * *',
    runImmediately: true
  }
};

module.exports = {
  taskStatusUpdateConfig,
  schedulerServiceConfig
}; 