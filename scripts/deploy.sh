#!/bin/bash
# 部署脚本 - 用于在云服务器上部署SKC服务

# 颜色设置
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# 打印带颜色的消息
print_message() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] 警告: $1${NC}"
}

print_error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] 错误: $1${NC}"
}

# 检查命令是否存在
check_command() {
  if ! command -v $1 &> /dev/null; then
    print_error "$1 命令未找到，请先安装。"
    exit 1
  fi
}

# 主要部署流程
main() {
  print_message "开始部署SKC服务..."

  # 确认部署环境
  read -p "您确定要在生产环境中部署吗？ (y/n): " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    print_message "部署已取消。"
    exit 0
  fi

  # 检查必要命令
  check_command node
  check_command npm
  check_command pm2

  # 获取Node.js版本信息
  node_version=$(node -v)
  print_message "当前Node.js版本: $node_version"
  
  # 检查Node.js版本
  node_major_version=$(node -v | cut -d. -f1 | tr -d 'v')
  if [ "$node_major_version" -lt 14 ]; then
    print_warning "Node.js版本过低，建议使用v14或更高版本"
    read -p "是否继续部署？ (y/n): " continue_deploy
    if [[ "$continue_deploy" != "y" && "$continue_deploy" != "Y" ]]; then
      print_message "部署已取消。"
      exit 0
    fi
  fi

  # 安装依赖
  print_message "安装依赖..."
  npm install --production
  if [ $? -ne 0 ]; then
    print_error "安装依赖失败。"
    exit 1
  fi

  # 创建必要的目录
  print_message "创建必要的目录..."
  mkdir -p logs
  chmod 755 logs

  # 检查.env文件
  if [ ! -f .env ]; then
    print_warning ".env文件不存在。请创建并配置.env文件。"
    cp .env.production.example .env
    print_warning "已从.env.production.example创建.env文件，请编辑它并配置正确的参数。"
    print_warning "配置完成后，请重新运行此脚本。"
    exit 1
  else
    print_message ".env文件已存在，确保其中的配置正确。"
  fi

  # 检查NODE_ENV环境变量
  grep -q "NODE_ENV=production" .env
  if [ $? -ne 0 ]; then
    print_warning "未在.env文件中检测到NODE_ENV=production。建议在生产环境中设置NODE_ENV=production。"
    read -p "是否自动修复？(y/n): " fix_env
    if [[ "$fix_env" == "y" || "$fix_env" == "Y" ]]; then
      sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
      print_message "已将NODE_ENV设置为production。"
    fi
  fi

  # 检查新增的关键环境变量
  check_env_var() {
    var_name=$1
    grep -q "$var_name=" .env
    if [ $? -ne 0 ]; then
      print_warning "未在.env文件中检测到$var_name。"
      # 从示例文件中提取默认值
      default_value=$(grep "$var_name=" .env.production.example | cut -d= -f2)
      read -p "是否添加$var_name=$default_value？(y/n): " add_var
      if [[ "$add_var" == "y" || "$add_var" == "Y" ]]; then
        echo "$var_name=$default_value" >> .env
        print_message "已添加$var_name=$default_value到.env文件。"
      fi
    fi
  }

  # 检查JWT相关变量
  check_env_var "JWT_SECRET"
  check_env_var "JWT_EXPIRES_IN"

  # 检查基础URL变量
  check_env_var "ADMIN_BASE_URL"
  check_env_var "H5_BASE_URL"

  # 检查端口配置
  check_env_var "ADMIN_PORT"
  check_env_var "H5_PORT"

  # 检查数据库配置
  check_env_var "DB_HOST"
  check_env_var "DB_PORT"
  check_env_var "DB_USER"
  check_env_var "DB_PASSWORD"
  check_env_var "DB_NAME"
  check_env_var "DB_POOL_LIMIT"

  # 检查日志配置
  check_env_var "LOG_LEVEL"

  # 检查支付配置
  check_env_var "PAYMENT_API_URL"
  check_env_var "PAYMENT_QUERY_API_URL"

  # 检查API签名配置
  check_env_var "API_SIGN_SECRET"
  check_env_var "API_SIGN_EXPIRE_TIME"

  # 检查OSS配置
  check_env_var "OSS_ACCESS_KEY_ID"
  check_env_var "OSS_ACCESS_KEY_SECRET"
  check_env_var "OSS_REGION"
  check_env_var "OSS_BUCKET"
  check_env_var "OSS_DIR"

  # 检查部署配置
  check_env_var "DEPLOY_HOST"
  check_env_var "DEPLOY_REPO"

  # 数据库迁移
  print_message "执行数据库迁移..."
  npm run migrate
  if [ $? -ne 0 ]; then
    print_error "数据库迁移失败。请检查数据库配置和连接。"
    exit 1
  fi

  # 启动PM2
  print_message "使用PM2启动服务..."
  pm2 start ecosystem.config.js
  if [ $? -ne 0 ]; then
    print_error "PM2启动失败。"
    exit 1
  fi

  # 保存PM2配置
  print_message "保存PM2配置..."
  pm2 save
  
  # 设置PM2开机自启
  print_message "设置PM2开机自启..."
  pm2_startup=$(pm2 startup | grep "sudo" | tail -n 1)
  if [ -n "$pm2_startup" ]; then
    print_message "请手动执行以下命令设置PM2开机自启:"
    echo $pm2_startup
  fi

  # 从.env文件中获取端口和基础URL配置
  ADMIN_PORT=$(grep "ADMIN_PORT=" .env | cut -d= -f2 || echo "3002")
  ADMIN_BASE_URL=$(grep "ADMIN_BASE_URL=" .env | cut -d= -f2 || echo "/api/admin")
  H5_PORT=$(grep "H5_PORT=" .env | cut -d= -f2 || echo "3001")
  H5_BASE_URL=$(grep "H5_BASE_URL=" .env | cut -d= -f2 || echo "/api/h5")

  print_message "部署完成!"
  print_message "管理后台运行在: http://localhost:${ADMIN_PORT:-3002}${ADMIN_BASE_URL:-/api/admin}"
  print_message "H5前端运行在: http://localhost:${H5_PORT:-3001}${H5_BASE_URL:-/api/h5}"
  print_message "API签名已经配置，请确保客户端正确实现签名验证"
  print_message "建议使用Nginx反向代理配置HTTPS和域名"
}

# 执行主函数
main 