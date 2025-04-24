/*
 * @Author: diaochan
 * @Date: 2025-04-20 22:59:48
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-24 18:58:45
 * @Description: 
 */
/**
 * PM2 配置文件
 * 用于生产环境部署和进程管理
 */
module.exports = {
  apps: [
    {
      // 管理后台服务
      name: 'skc-admin',
      script: 'src/admin/admin-server.js',
      instances: 2, // 为4核CPU分配2个实例以避免资源竞争
      exec_mode: 'cluster', // 使用集群模式以实现负载均衡
      watch: false, // 生产环境中不启用文件监视
      max_memory_restart: '400M', // 内存超过400M时自动重启
      exp_backoff_restart_delay: 100, // 失败后重启延迟（毫秒）
      merge_logs: true, // 合并所有实例的日志输出
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: "logs/skc-admin-err.log",
      out_file: "logs/skc-admin-out.log",
      time: true, // 为日志添加时间戳
      node_args: "--max-old-space-size=400", // 限制V8引擎老生代内存上限
      cron_restart: "0 4 * * *", // 每天凌晨4点重启以防止内存泄漏
      kill_timeout: 3000, // 等待3秒后强制关闭进程
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 3002,
        ADMIN_BASE_URL: '/api/admin',
      }
    },
    {
      // H5前端服务
      name: 'skc-h5',
      script: 'src/h5/h5-server.js',
      instances: 2, // 为4核CPU分配2个实例以避免资源竞争
      exec_mode: 'cluster', // 使用集群模式以实现负载均衡
      watch: false, // 生产环境中不启用文件监视
      max_memory_restart: '400M', // 内存超过400M时自动重启
      exp_backoff_restart_delay: 100, // 失败后重启延迟（毫秒）
      merge_logs: true, // 合并所有实例的日志输出
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: "logs/skc-h5-err.log",
      out_file: "logs/skc-h5-out.log",
      time: true, // 为日志添加时间戳
      node_args: "--max-old-space-size=400", // 限制V8引擎老生代内存上限
      cron_restart: "0 3 * * *", // 每天凌晨3点重启以防止内存泄漏（错开与admin服务重启时间）
      kill_timeout: 3000, // 等待3秒后强制关闭进程
      env: {
        NODE_ENV: 'production',
        H5_PORT: 3001,
        H5_BASE_URL: '/api/h5',
      }
    }
  ],

  // 部署配置（需要根据实际情况修改）
  deploy: {
    production: {
      user: 'root', // 服务器用户名
      host: process.env.DEPLOY_HOST || '47.250.185.212', // 从环境变量获取或使用默认值
      ref: 'origin/main', // Git分支
      repo: process.env.DEPLOY_REPO || 'git@github.com:rueen/skc_service.git', // 从环境变量获取或使用默认值
      path: '/var/www/skc_service', // 部署目录
      'pre-deploy': 'git fetch --all',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'echo "正在准备设置目录" && mkdir -p /var/www/skc_service'
    }
  }
}; 