#!/bin/bash
# SKC数据库备份脚本 - JPSKC站点
# 用途：自动备份数据库并保留指定天数的备份文件

# ===========================================
# 配置区域（请根据实际情况修改）
# ===========================================
# 数据库配置
DB_NAME="skc"
DB_USER="skc_user"
DB_PASS="your_database_password"  # 请替换为实际密码
DB_HOST="localhost"
DB_PORT="3306"

# 备份配置
BACKUP_DIR="/var/backups/skc_db"
BACKUP_RETENTION_DAYS=30  # 保留30天的备份
LOG_FILE="/var/log/skc_backup.log"

# 颜色设置
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # 无颜色

# ===========================================
# 函数定义
# ===========================================
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

# 记录日志
log_message() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# 检查命令是否存在
check_command() {
  if ! command -v $1 &> /dev/null; then
    print_error "$1 命令未找到，请先安装。"
    log_message "错误: $1 命令未找到"
    exit 1
  fi
}

# 创建备份目录
create_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    print_message "创建备份目录: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    if [ $? -ne 0 ]; then
      print_error "无法创建备份目录"
      log_message "错误: 无法创建备份目录 $BACKUP_DIR"
      exit 1
    fi
  fi
}

# 执行数据库备份
backup_database() {
  local date_str=$(date +%Y%m%d_%H%M%S)
  local backup_file="$BACKUP_DIR/${DB_NAME}-${date_str}.sql"
  local compressed_file="${backup_file}.gz"
  
  print_message "开始备份数据库: $DB_NAME"
  log_message "开始备份数据库: $DB_NAME"
  
  # 执行备份
  mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --add-drop-database \
    --databases "$DB_NAME" > "$backup_file"
  
  if [ $? -eq 0 ]; then
    print_message "数据库备份成功: $backup_file"
    log_message "数据库备份成功: $backup_file"
    
    # 压缩备份文件
    print_message "压缩备份文件..."
    gzip "$backup_file"
    
    if [ $? -eq 0 ]; then
      print_message "备份文件压缩成功: $compressed_file"
      log_message "备份文件压缩成功: $compressed_file"
      
      # 显示文件大小
      local file_size=$(du -h "$compressed_file" | cut -f1)
      print_message "备份文件大小: $file_size"
      log_message "备份文件大小: $file_size"
    else
      print_error "备份文件压缩失败"
      log_message "错误: 备份文件压缩失败"
    fi
  else
    print_error "数据库备份失败"
    log_message "错误: 数据库备份失败"
    # 清理失败的备份文件
    [ -f "$backup_file" ] && rm -f "$backup_file"
    exit 1
  fi
}

# 清理旧备份文件
cleanup_old_backups() {
  print_message "清理 $BACKUP_RETENTION_DAYS 天前的备份文件..."
  log_message "开始清理旧备份文件，保留天数: $BACKUP_RETENTION_DAYS"
  
  local deleted_count=$(find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete -print | wc -l)
  
  if [ $deleted_count -gt 0 ]; then
    print_message "已删除 $deleted_count 个旧备份文件"
    log_message "已删除 $deleted_count 个旧备份文件"
  else
    print_message "没有需要清理的旧备份文件"
    log_message "没有需要清理的旧备份文件"
  fi
}

# 显示备份统计信息
show_backup_stats() {
  local total_backups=$(find "$BACKUP_DIR" -type f -name "*.sql.gz" | wc -l)
  local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
  
  print_message "备份统计信息:"
  print_message "  备份文件数量: $total_backups"
  print_message "  总备份大小: $total_size"
  print_message "  备份目录: $BACKUP_DIR"
  
  log_message "备份统计 - 文件数量: $total_backups, 总大小: $total_size"
}

# ===========================================
# 主函数
# ===========================================
main() {
  print_message "SKC数据库备份脚本开始执行..."
  log_message "=== 备份脚本开始执行 ==="
  
  # 检查必要的命令
  check_command mysqldump
  check_command gzip
  
  # 创建备份目录
  create_backup_dir
  
  # 执行备份
  backup_database
  
  # 清理旧备份
  cleanup_old_backups
  
  # 显示统计信息
  show_backup_stats
  
  print_message "数据库备份完成!"
  log_message "=== 备份脚本执行完成 ==="
  echo ""
}

# ===========================================
# 脚本入口
# ===========================================
# 检查是否以root身份运行（推荐）
if [ "$EUID" -ne 0 ]; then
  print_warning "建议以root身份运行此脚本以确保权限正确"
fi

# 执行主函数
main "$@"
