# SKC服务JPSKC站点CentOS部署指南

本文档为前端工程师提供了在阿里云CentOS服务器上部署SKC服务的详细步骤。每一步都会详细解释操作目的和验证方法。

## 📋 目录

- [服务器信息](#服务器信息)
- [系统环境确认](#系统环境确认)
- [前期准备](#前期准备)
- [第一步：连接服务器](#第一步连接服务器)
- [第二步：安装基础软件](#第二步安装基础软件)
- [第三步：配置防火墙](#第三步配置防火墙)
- [第四步：部署代码](#第四步部署代码)
- [第五步：配置环境变量](#第五步配置环境变量)
- [第六步：配置数据库](#第六步配置数据库)
- [第七步：启动应用服务](#第七步启动应用服务)
- [第八步：配置Nginx](#第八步配置nginx)
- [第九步：配置SSL证书](#第九步配置ssl证书)
- [第十步：配置域名解析](#第十步配置域名解析)
- [第十一步：设置数据库备份](#第十一步设置数据库备份)
- [验证部署](#验证部署)
- [常见问题](#常见问题)

## 🖥️ 服务器信息

- **服务器IP**: 8.216.35.146
- **操作系统**: CentOS 8/9 (阿里云ECS)
- **包管理器**: dnf (CentOS 8+) / yum (CentOS 7)
- **防火墙**: firewalld
- **域名配置**:
  - H5前端: m.jpskc.com
  - H5接口: api.jpskc.com
  - Admin前端: support.jpskc.com
  - Admin接口: sapi.jpskc.com

## 🔍 系统环境确认

### 目的
确认服务器系统版本和基础环境，为后续安装做准备。

### 操作步骤

1. **检查系统版本**：
```bash
cat /etc/os-release
```
**预期输出**：应该显示CentOS版本信息

2. **检查系统架构**：
```bash
uname -a
```
**目的**：确认是x86_64架构

3. **检查当前用户权限**：
```bash
whoami
id
```
**目的**：确认当前用户是root或有sudo权限

4. **检查网络连接**：
```bash
ping -c 3 8.8.8.8
```
**目的**：确认网络连接正常

## 🚀 前期准备

### 需要准备的工具

1. **SSH客户端**（Windows推荐使用PuTTY或Windows Terminal，Mac/Linux使用终端）
2. **服务器登录信息**（用户名、密码或私钥）
3. **域名管理权限**（用于配置DNS解析）

### 部署架构图

```
[前端用户] 
    ↓
[域名 (m.jpskc.com/support.jpskc.com)]
    ↓
[Nginx反向代理]
    ↓
[Node.js应用 (端口3001/3002)]
    ↓
[MySQL数据库]
```

## 📡 第一步：连接服务器

### 目的
建立与阿里云服务器的安全连接，获得服务器操作权限。

### 操作步骤

1. **使用SSH连接服务器**：
```bash
ssh root@8.216.35.146
```

2. **验证连接成功**：
连接成功后，你会看到类似这样的命令提示符：
```bash
[root@iZ6we5pny3nv6dvz1n9cc5Z ~]#
```

### 如果遇到问题
- 连接超时：检查服务器是否开启，安全组是否允许SSH(22端口)
- 密钥验证失败：确认用户名和密码/密钥正确

## 🛠️ 第二步：安装基础软件

### 目的
安装运行SKC服务所需的所有软件环境。

### 操作步骤

1. **更新系统包**：
```bash
# 更新系统包列表
sudo dnf update -y

# 或者使用yum（CentOS 7）
# sudo yum update -y
```
**目的**: 获取最新的软件包信息，确保安装的是最新版本。

2. **安装基础工具**：
```bash
sudo dnf install -y curl wget git unzip vim
```
**目的**: 安装后续安装过程中需要的基础工具。

3. **安装Node.js和npm**：
```bash
# 添加Node.js官方源
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -

# 安装Node.js
sudo dnf install -y nodejs

# 验证安装
node -v  # 应该显示v18.x.x
npm -v   # 应该显示8.x.x或更高
```
**目的**: Node.js是运行我们JavaScript应用的环境，npm是包管理器。

4. **安装PM2进程管理器**：
```bash
sudo npm install -g pm2
```
**目的**: PM2用于管理Node.js应用进程，提供自动重启、日志管理等功能。

5. **安装Nginx Web服务器**：
```bash
sudo dnf install -y nginx
```
**目的**: Nginx作为反向代理服务器，处理HTTPS、负载均衡和静态文件服务。

6. **安装MySQL数据库**：
```bash
sudo dnf install -y mysql-server
```
**目的**: MySQL用于存储应用数据。

7. **安装Certbot（用于SSL证书）**：
```bash
# 安装EPEL仓库
sudo dnf install -y epel-release

# 安装Certbot
sudo dnf install -y certbot python3-certbot-nginx
```
**目的**: Certbot用于自动获取和配置Let's Encrypt SSL证书。

### 验证安装
运行以下命令确认所有软件都正确安装：
```bash
node -v && npm -v && pm2 -v && nginx -v && mysql --version && git --version && certbot --version
```

## 🔒 第三步：配置防火墙

### 目的
配置服务器防火墙，只允许必要的网络流量，提高安全性。

### 操作步骤

1. **启动并启用firewalld**：
```bash
sudo systemctl start firewalld
sudo systemctl enable firewalld
```
**目的**: 启动CentOS的防火墙服务。

2. **配置防火墙规则**：
```bash
# 允许SSH连接（重要：先允许SSH，否则可能断开连接）
sudo firewall-cmd --permanent --add-service=ssh

# 允许HTTP流量（端口80）
sudo firewall-cmd --permanent --add-service=http

# 允许HTTPS流量（端口443）
sudo firewall-cmd --permanent --add-service=https

# 重新加载防火墙配置
sudo firewall-cmd --reload
```

3. **检查防火墙状态**：
```bash
sudo firewall-cmd --list-all
```
应该看到类似输出：
```
public (active)
  target: default
  icmp-block-inversion: no
  interfaces: eth0
  sources: 
  services: ssh http https
  ports: 
  protocols: 
  forward: no
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules:
```

### 阿里云安全组配置
同时需要在阿里云控制台配置安全组规则：
- 入方向：允许22(SSH)、80(HTTP)、443(HTTPS)端口
- 出方向：允许所有流量

## 📦 第四步：部署代码

### 目的
将SKC项目代码部署到服务器，并安装项目依赖。

### 操作步骤

1. **创建应用目录**：
```bash
sudo mkdir -p /var/www/skc_service
sudo chown $USER:$USER /var/www/skc_service
```
**目的**: 创建专门的目录存放应用代码，设置正确的权限。

2. **克隆项目代码**：
```bash
git clone https://github.com/rueen/skc_service.git /var/www/skc_service
cd /var/www/skc_service
```
**目的**: 从Git仓库下载最新的项目代码。

3. **安装项目依赖**：
```bash
# 安装Node.js依赖包
npm install
```
**目的**：安装项目运行所需的所有npm包。

4. **创建必要目录**：
```bash
# 创建日志目录
mkdir -p logs

# 创建上传文件目录
mkdir -p uploads

# 设置目录权限
chmod 755 logs uploads
```
**目的**：为应用创建日志和文件上传目录。

5. **验证项目结构**：
```bash
# 检查项目文件结构
ls -la
```
应该看到以下关键文件和目录：
- `src/` - 源代码目录
- `scripts/` - 脚本目录
- `docs/` - 文档目录
- `package.json` - 项目配置
- `ecosystem.config.js` - PM2配置

## ⚙️ 第五步：配置环境变量

### 目的
配置应用运行所需的环境变量，包括数据库连接、域名、密钥等。

### 操作步骤

1. **复制环境配置模板**：
```bash
cd /var/www/skc_service
cp docs/env.jpskc.example .env
```

2. **生成安全密钥**：
```bash
# 生成JWT密钥（运行3次，分别用于不同用途）
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
```
保存这些密钥，稍后配置时会用到。

3. **编辑环境配置文件**：
```bash
nano .env
```

4. **配置重要参数**：
根据模板，需要修改以下关键配置：

```bash
# 将生成的密钥填入这些字段
ADMIN_JWT_SECRET=第一个生成的密钥
H5_JWT_SECRET=第二个生成的密钥
API_SIGN_SECRET=第三个生成的密钥

# 数据库密码（下一步会设置）
DB_PASSWORD=your_strong_database_password
```

**重要提示**: 
- 使用强密码
- 不要在生产环境使用示例中的默认值
- 保存好这些密钥，丢失后需要重新生成

### 配置文件说明
- `NODE_ENV=production`: 告诉应用这是生产环境
- `ADMIN_PORT/H5_PORT`: 应用监听的端口
- `CORS_ORIGINS`: 允许跨域访问的域名
- `OSS_*`: 阿里云对象存储配置（已预配置）

## 🗄️ 第六步：配置数据库

### 目的
创建应用专用的数据库和用户，确保数据安全和访问控制。

### 操作步骤

1. **启动MySQL服务**：
```bash
sudo systemctl start mysqld
sudo systemctl enable mysqld
```
**目的**: 启动MySQL数据库服务。

2. **获取MySQL临时密码**：
```bash
sudo grep 'temporary password' /var/log/mysqld.log
```
**目的**: CentOS安装MySQL后会生成临时密码。

3. **设置MySQL安全配置**：
```bash
sudo mysql_secure_installation
```
**按照提示进行配置**：
- 输入临时密码
- 设置新root密码：选择一个强密码
- 移除匿名用户：Y
- 禁止root远程登录：Y
- 删除测试数据库：Y
- 重新加载权限表：Y

4. **登录MySQL**：
```bash
mysql -u root -p
```
输入刚才设置的root密码。

5. **创建数据库和用户**：
```sql
-- 创建数据库
CREATE DATABASE skc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（替换your_strong_password为强密码）
CREATE USER 'skc_user'@'localhost' IDENTIFIED BY 'your_strong_password';

-- 授权
GRANT ALL PRIVILEGES ON skc.* TO 'skc_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

6. **更新.env文件中的数据库密码**：
```bash
nano .env
```
将`DB_PASSWORD=请替换为数据库密码`改为实际设置的密码。

7. **执行数据库迁移**：
```bash
# 确保在项目目录
cd /var/www/skc_service

# 运行数据库迁移脚本
node scripts/run-migrations.js
```
**目的**: 创建应用需要的所有数据表和初始数据。

**验证迁移结果**：
```bash
# 登录数据库查看创建的表
mysql -u skc_user -p -e "USE skc; SHOW TABLES;"
```
应该看到创建的数据表列表。

### 验证数据库配置
```bash
# 测试数据库连接
mysql -u skc_user -p -e "SHOW DATABASES;"
```
应该能看到skc数据库。

## 🚀 第七步：启动应用服务

### 目的
使用PM2启动Node.js应用，确保应用稳定运行并自动重启。

### 操作步骤

1. **检查环境配置**：
```bash
# 确保在项目目录
cd /var/www/skc_service

# 检查.env文件是否存在且配置正确
cat .env | grep -E "DB_|JWT_|PORT"
```

2. **测试应用启动**：
```bash
# 先测试H5应用能否正常启动
node src/h5/h5-server.js &
sleep 3
ps aux | grep node

# 停止测试进程
pkill -f h5-server.js
```

3. **使用PM2启动应用**：
```bash
# 启动所有应用服务
pm2 start ecosystem.config.js

# 显示详细启动信息
pm2 describe skc-admin
pm2 describe skc-h5
```

4. **检查应用状态**：
```bash
pm2 list
```
**预期结果**：应该看到两个进程都处于"online"状态：
- `skc-admin` (端口3002)
- `skc-h5` (端口3001)

5. **查看应用日志**：
```bash
# 查看所有日志
pm2 logs

# 查看特定应用日志
pm2 logs skc-admin
pm2 logs skc-h5
```
**检查要点**：确认没有数据库连接错误或其他启动错误。

6. **测试应用响应**：
```bash
# 测试H5应用
curl -i http://localhost:3001/health

# 测试Admin应用
curl -i http://localhost:3002/health
```
**预期结果**：应该返回200状态码和健康检查信息。

7. **保存PM2配置**：
```bash
pm2 save
```

8. **设置开机自启**：
```bash
pm2 startup
```
执行输出的命令（通常以sudo开头）。

### PM2常用命令
- `pm2 restart all`: 重启所有应用
- `pm2 stop all`: 停止所有应用
- `pm2 delete all`: 删除所有应用
- `pm2 monit`: 监控应用状态

## 🌐 第八步：配置Nginx

### 目的
配置Nginx作为反向代理，处理4个域名的HTTPS请求和静态文件服务。

### 操作步骤

1. **复制Nginx配置文件**：
```bash
sudo cp /var/www/skc_service/docs/nginx-centos-jpskc.conf /etc/nginx/conf.d/jpskc.conf
```

2. **创建前端文件目录**：
```bash
sudo mkdir -p /var/www/skc_h5
sudo mkdir -p /var/www/skc_support
```
**目的**: 为前端静态文件创建目录。

3. **创建临时首页**（用于测试）：
```bash
echo "<h1>SKC H5 Frontend - Coming Soon</h1>" | sudo tee /var/www/skc_h5/index.html
echo "<h1>SKC Admin Support - Coming Soon</h1>" | sudo tee /var/www/skc_support/index.html
```

4. **设置目录权限**：
```bash
sudo chown -R nginx:nginx /var/www/skc_h5
sudo chown -R nginx:nginx /var/www/skc_support
```

5. **测试Nginx配置**：
```bash
sudo nginx -t
```
应该显示"syntax is ok"和"test is successful"。

6. **启动并启用Nginx**：
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

7. **检查Nginx状态**：
```bash
sudo systemctl status nginx
```

### Nginx配置解释

我们的配置文件包含以下重要部分：

1. **上游服务器定义**：将请求转发到Node.js应用
2. **速率限制**：防止API被恶意请求
3. **SSL配置**：HTTPS安全连接
4. **CORS配置**：跨域访问控制
5. **静态文件服务**：前端资源处理

## 🔐 第九步：配置SSL证书

### 目的
为4个域名配置免费的Let's Encrypt SSL证书，启用HTTPS。

### 操作步骤

1. **获取SSL证书**：
```bash
# 为H5前端域名获取证书
sudo certbot --nginx -d m.jpskc.com

# 为H5 API域名获取证书
sudo certbot --nginx -d api.jpskc.com

# 为Admin前端域名获取证书
sudo certbot --nginx -d support.jpskc.com

# 为Admin API域名获取证书
sudo certbot --nginx -d sapi.jpskc.com
```

**注意**: 运行每个命令时：
- 选择是否分享邮箱：根据需要选择
- 同意服务条款：选择Y
- 选择重定向：选择2（强制HTTPS）

2. **测试自动续期**：
```bash
sudo certbot renew --dry-run
```

3. **设置自动续期**：
```bash
sudo crontab -e
```
添加以下行：
```
0 3 * * * /usr/bin/certbot renew --quiet
```

### 如果证书获取失败
1. **检查域名解析**：确认域名已正确解析到服务器IP
2. **检查防火墙**：确保80和443端口开放
3. **检查Nginx**：确保Nginx正在运行

## 🌍 第十步：配置域名解析

### 目的
将域名指向服务器IP，使用户能够通过域名访问服务。

### 操作步骤

在你的域名服务商控制台添加以下DNS记录：

```
类型    名称        值
A      m           8.216.35.146
A      api         8.216.35.146
A      support     8.216.35.146
A      sapi        8.216.35.146
```

### 验证域名解析
```bash
# 检查域名解析（在本地电脑执行）
nslookup m.jpskc.com
nslookup api.jpskc.com
nslookup support.jpskc.com
nslookup sapi.jpskc.com
```

所有域名都应该返回8.216.35.146。

## 💾 第十一步：设置数据库备份

### 目的
设置自动数据库备份，防止数据丢失。

### 操作步骤

1. **复制备份脚本**：
```bash
sudo cp /var/www/skc_service/docs/backup-database.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/backup-database.sh
```

2. **编辑备份脚本配置**：
```bash
sudo nano /usr/local/bin/backup-database.sh
```
修改数据库密码：
```bash
DB_PASS="your_actual_database_password"
```

3. **创建备份目录**：
```bash
sudo mkdir -p /var/backups/skc_db
sudo chown $USER:$USER /var/backups/skc_db
```

4. **测试备份脚本**：
```bash
sudo /usr/local/bin/backup-database.sh
```

5. **设置定时备份**：
```bash
sudo crontab -e
```
添加以下行（每天凌晨3点备份）：
```
0 3 * * * /usr/local/bin/backup-database.sh
```

### 备份脚本功能
- 自动备份数据库
- 压缩备份文件节省空间
- 保留30天的备份历史
- 记录操作日志
- 显示备份统计信息

## ✅ 验证部署

### 检查服务状态
```bash
# 检查PM2进程
pm2 list

# 检查Nginx状态
sudo systemctl status nginx

# 检查MySQL状态
sudo systemctl status mysqld

# 检查端口监听
netstat -tulpn | grep -E ":(80|443|3001|3002)"
```

### 测试API接口
```bash
# 测试H5 API
curl -k https://api.jpskc.com/health

# 测试Admin API
curl -k https://sapi.jpskc.com/health
```

### 测试前端访问
在浏览器中访问：
- https://m.jpskc.com
- https://support.jpskc.com

应该能看到"SKC H5 Frontend - Coming Soon"和"SKC Admin Support - Coming Soon"页面。

## 🚨 常见问题

### 1. 服务无法启动
**症状**: PM2显示应用状态为"errored"
**解决方案**:
```bash
# 查看详细错误日志
pm2 logs

# 检查环境配置
cat .env

# 重启服务
pm2 restart all
```

### 2. 域名无法访问
**症状**: 浏览器显示"无法访问此网站"
**检查项目**:
1. DNS解析是否正确
2. 防火墙是否开放端口
3. Nginx是否正常运行
4. SSL证书是否有效

### 3. 数据库连接失败
**症状**: 应用日志显示数据库连接错误
**解决方案**:
```bash
# 测试数据库连接
mysql -u skc_user -p

# 检查数据库服务状态
sudo systemctl status mysqld

# 重启数据库服务
sudo systemctl restart mysqld
```

### 4. SSL证书获取失败
**症状**: Certbot报错
**解决方案**:
1. 确认域名解析正确
2. 检查80端口是否开放
3. 临时停止Nginx再重试

### 5. 权限问题
**症状**: 操作被拒绝
**解决方案**:
```bash
# 检查文件权限
ls -la /var/www/skc_service

# 修复权限
sudo chown -R $USER:$USER /var/www/skc_service
```

### 6. CentOS特有问题

#### SELinux问题
如果遇到SELinux相关错误：
```bash
# 检查SELinux状态
sestatus

# 临时禁用SELinux（重启后恢复）
sudo setenforce 0

# 永久禁用SELinux（需要重启）
sudo nano /etc/selinux/config
# 修改 SELINUX=disabled
```

#### 防火墙问题
如果firewalld启动失败：
```bash
# 检查firewalld状态
sudo systemctl status firewalld

# 重启firewalld
sudo systemctl restart firewalld

# 检查防火墙规则
sudo firewall-cmd --list-all
```

## 📞 技术支持

如果遇到本文档未涵盖的问题：
1. 查看应用日志：`pm2 logs`
2. 查看Nginx日志：`sudo tail -f /var/log/nginx/error.log`
3. 查看系统日志：`sudo journalctl -u nginx`

---

**部署完成！🎉**

现在你的SKC服务已经成功部署在阿里云CentOS服务器上，具备了：
- HTTPS安全访问
- 自动进程管理
- 数据库自动备份
- 负载均衡和反向代理
- 完整的监控和日志系统
