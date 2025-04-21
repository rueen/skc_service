# SKC服务部署指南

本文档提供了将SKC服务部署到生产环境的详细步骤，包括服务器准备、环境配置、应用部署和Web服务器设置。

## 目录

- [前提条件](#前提条件)
- [服务器准备](#服务器准备)
- [代码部署](#代码部署)
- [环境配置](#环境配置)
- [数据库设置](#数据库设置)
- [应用启动](#应用启动)
- [Nginx配置](#nginx配置)
- [SSL证书配置](#ssl证书配置)
- [系统维护](#系统维护)
- [常见问题](#常见问题)

## 前提条件

部署前请确保您已经具备以下条件：

- 一台Linux服务器（推荐Ubuntu 20.04或更高版本）
- 域名（如果需要通过域名访问）
- MySQL数据库（版本5.7或更高）
- Node.js环境（版本16.x或更高）
- 基本的Linux命令行知识

## 服务器准备

### 安装必要软件

登录服务器后，首先安装必要的软件：

```bash
# 更新包列表
sudo apt update

# 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v  # 应显示18.x版本
npm -v   # 应显示8.x或更高版本

# 安装PM2进程管理器
sudo npm install -g pm2

# 安装Nginx
sudo apt install -y nginx

# 安装MySQL（如果需要在同一服务器上运行数据库）
sudo apt install -y mysql-server

# 安装Git
sudo apt install -y git
```

### 防火墙设置

配置防火墙以允许必要的端口：

```bash
# 允许SSH连接
sudo ufw allow ssh

# 允许HTTP和HTTPS流量
sudo ufw allow 80
sudo ufw allow 443

# 启用防火墙
sudo ufw enable
```

## 代码部署

### 克隆代码仓库

```bash
# 创建应用目录
sudo mkdir -p /var/www/skc_service
sudo chown $USER:$USER /var/www/skc_service

# 克隆代码仓库
git clone git@github.com:rueen/skc_service.git /var/www/skc_service
cd /var/www/skc_service
```

### 使用部署脚本

项目包含一个自动化部署脚本，可以简化部署流程：

```bash
# 确保脚本有执行权限
chmod +x scripts/deploy.sh

# 运行部署脚本
./scripts/deploy.sh
```

脚本将执行以下操作：
1. 安装项目依赖
2. 创建必要的目录（logs）
3. 检查和配置环境变量
4. 执行数据库迁移
5. 使用PM2启动服务
6. 配置PM2自启动

## 环境配置

### 设置环境变量

1. 创建环境配置文件：

```bash
cp .env.production.example .env
```

2. 编辑.env文件，配置以下重要参数：

```
# 环境
NODE_ENV=production

# 服务端口和API路径
ADMIN_PORT=3002
ADMIN_BASE_URL=/api/support
H5_PORT=3001
H5_BASE_URL=/api/h5

# 数据库配置
DB_HOST=<数据库主机地址>
DB_PORT=3306
DB_USER=<数据库用户名>
DB_PASSWORD=<数据库密码>
DB_NAME=skc

# JWT密钥（使用强随机字符串）
ADMIN_JWT_SECRET=<生成的管理后台JWT密钥>
H5_JWT_SECRET=<生成的H5端JWT密钥>

# CORS设置（如果有跨域需求）
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com
```

可以使用以下命令生成安全的随机密钥：

```bash
openssl rand -base64 32
```

## 数据库设置

### 创建数据库和用户

```bash
# 登录MySQL
sudo mysql

# 创建数据库
CREATE DATABASE skc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户并授权
CREATE USER 'skc_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON skc.* TO 'skc_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 执行数据库迁移

```bash
# 在项目目录下执行
npm run migrate
```

## 应用启动

### 使用PM2启动应用

项目包含PM2配置文件（ecosystem.config.js），可以直接使用它启动应用：

```bash
# 启动服务
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
# 执行输出的命令
```

### 查看应用状态

```bash
# 查看进程状态
pm2 list

# 查看日志
pm2 logs

# 监控应用
pm2 monit
```

## Nginx配置

### 创建Nginx配置文件

```bash
# 复制示例配置
sudo cp scripts/nginx-config.example /etc/nginx/sites-available/skc

# 编辑配置文件
sudo nano /etc/nginx/sites-available/skc
```

修改配置文件中的域名和证书路径等信息。确保Nginx配置中的API路径与应用配置一致：
- 管理后台API: `/api/support` -> `http://localhost:3002`
- H5前端API: `/api/h5` -> `http://localhost:3001`

### 启用站点

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/skc /etc/nginx/sites-enabled/

# 测试配置文件语法
sudo nginx -t

# 如果测试通过，重启Nginx
sudo systemctl restart nginx
```

## SSL证书配置

### 使用Let's Encrypt获取免费SSL证书

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取并配置证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

Certbot会自动修改Nginx配置，添加SSL证书设置。

## 系统维护

### 日志管理

项目已配置了日志轮换功能，日志文件存储在logs目录中。可以通过以下命令查看日志：

```bash
# 查看服务器输出日志
tail -f logs/skc-admin-out.log
tail -f logs/skc-h5-out.log

# 查看错误日志
tail -f logs/skc-admin-err.log
tail -f logs/skc-h5-err.log

# 手动清理日志
npm run clean-logs
```

### 应用更新

当需要更新应用时，可以执行以下步骤：

```bash
# 进入项目目录
cd /var/www/skc_service

# 拉取最新代码
git pull

# 安装依赖
npm install --production

# 执行数据库迁移（如果有）
npm run migrate

# 重启应用
pm2 reload ecosystem.config.js

# 保存PM2配置
pm2 save
```

### 数据库备份

定期备份数据库是一个好习惯：

```bash
# 创建备份目录
mkdir -p /var/backups/skc_db

# 创建备份脚本
echo '#!/bin/bash
BACKUP_DIR="/var/backups/skc_db"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="skc"
DB_USER="skc_user"
DB_PASS="your_password"

# 创建备份
mysqldump -u$DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/$DB_NAME-$DATE.sql.gz

# 保留最近30天的备份
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete
' > /usr/local/bin/backup_skc_db.sh

# 添加执行权限
chmod +x /usr/local/bin/backup_skc_db.sh

# 设置每日自动备份
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup_skc_db.sh") | crontab -
```

## 常见问题

### 服务无法启动

如果服务无法启动，请检查：

1. 日志文件中的错误信息：`pm2 logs`
2. 环境变量配置是否正确：检查.env文件
3. 数据库连接是否正常：验证数据库凭据和连接性
4. 端口是否被占用：`netstat -tulpn | grep <端口号>`

### 端口被占用

如果端口被占用，您可以：

1. 找出占用端口的进程：`sudo lsof -i:<端口号>`
2. 终止该进程：`sudo kill <PID>`
3. 或者修改应用配置使用其他端口

### Nginx配置问题

如果Nginx配置有问题：

1. 检查Nginx错误日志：`sudo tail -f /var/log/nginx/error.log`
2. 验证配置语法：`sudo nginx -t`
3. 重新加载配置：`sudo systemctl reload nginx`

### SSL证书问题

如果遇到SSL证书问题：

1. 检查证书路径和权限
2. 手动重新获取证书：`sudo certbot --nginx -d your-domain.com`
3. 检查证书状态：`sudo certbot certificates`

---

如果遇到未在本文档中列出的问题，请查阅项目源代码或联系技术支持团队。 