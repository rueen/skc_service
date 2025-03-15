/**
 * PM2 配置文件
 * 用于生产环境部署
 */
module.exports = {
  apps: [
    {
      name: 'skc-admin',
      script: 'src/admin/admin-server.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'skc-h5',
      script: 'src/h5/h5-server.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/skc_service.git',
      path: '/var/www/skc_service',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
}; 