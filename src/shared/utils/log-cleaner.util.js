/**
 * 日志清理工具
 * 用于清理过期的日志文件
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 日志目录路径
const logDirectory = path.join(process.cwd(), 'logs');

// 获取当前日期之前n天的日期字符串
function getDateStringDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// 清理旧的日志文件
function cleanOldLogs(daysToKeep = 14) {
  console.log(`开始清理超过${daysToKeep}天的日志文件...`);
  
  // 检查日志目录是否存在
  if (!fs.existsSync(logDirectory)) {
    console.log(`日志目录不存在: ${logDirectory}`);
    return;
  }
  
  // 获取截止日期
  const cutoffDate = getDateStringDaysAgo(daysToKeep);
  console.log(`保留${cutoffDate}之后的日志文件`);
  
  try {
    // 读取日志目录中的所有文件
    const files = fs.readdirSync(logDirectory);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    // 遍历文件
    files.forEach(file => {
      const filePath = path.join(logDirectory, file);
      
      // 跳过目录
      if (fs.statSync(filePath).isDirectory()) {
        return;
      }
      
      // 检查文件名中是否包含日期
      const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        const fileDate = dateMatch[0];
        
        // 如果文件日期早于截止日期，则删除
        if (fileDate < cutoffDate) {
          try {
            fs.unlinkSync(filePath);
            console.log(`已删除: ${file}`);
            deletedCount++;
          } catch (error) {
            console.error(`删除文件失败: ${file}`, error);
            errorCount++;
          }
        }
      } else if (file === 'error.log' || file === 'combined.log' || file.endsWith('-access.log')) {
        // 处理没有日期的旧格式日志文件
        // 如果使用了旧的日志格式，检查文件修改时间
        const stats = fs.statSync(filePath);
        const fileModifiedDate = new Date(stats.mtime);
        const cutoffDateTime = new Date(cutoffDate);
        
        if (fileModifiedDate < cutoffDateTime) {
          // 对于旧格式的日志文件，我们重命名它们，而不是删除
          const backupName = `${file}.${new Date().toISOString().replace(/:/g, '-')}`;
          const backupPath = path.join(logDirectory, backupName);
          
          try {
            fs.renameSync(filePath, backupPath);
            console.log(`已备份旧日志文件: ${file} -> ${backupName}`);
            // 创建新的空文件
            fs.writeFileSync(filePath, '');
            console.log(`已创建新的空日志文件: ${file}`);
          } catch (error) {
            console.error(`处理旧日志文件失败: ${file}`, error);
            errorCount++;
          }
        }
      }
    });
    
    console.log(`清理完成。删除了 ${deletedCount} 个文件，遇到 ${errorCount} 个错误。`);
  } catch (error) {
    console.error('清理日志文件时出错:', error);
  }
}

// 压缩旧的日志文件
function compressOldLogs(daysToCompress = 7) {
  console.log(`开始压缩超过${daysToCompress}天但未被删除的日志文件...`);
  
  // 检查是否安装了gzip
  exec('which gzip', (error) => {
    if (error) {
      console.log('未找到gzip，跳过压缩步骤');
      return;
    }
    
    // 获取截止日期
    const compressCutoffDate = getDateStringDaysAgo(daysToCompress);
    const deleteCutoffDate = getDateStringDaysAgo(14); // 保持与清理函数一致
    
    console.log(`压缩${compressCutoffDate}到${deleteCutoffDate}之间的日志文件`);
    
    try {
      // 读取日志目录中的所有文件
      const files = fs.readdirSync(logDirectory);
      
      // 遍历文件
      files.forEach(file => {
        const filePath = path.join(logDirectory, file);
        
        // 跳过目录和已压缩的文件
        if (fs.statSync(filePath).isDirectory() || file.endsWith('.gz')) {
          return;
        }
        
        // 检查文件名中是否包含日期
        const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          const fileDate = dateMatch[0];
          
          // 如果文件日期在压缩范围内，则压缩
          if (fileDate >= compressCutoffDate && fileDate < deleteCutoffDate) {
            exec(`gzip -f ${filePath}`, (error) => {
              if (error) {
                console.error(`压缩文件失败: ${file}`, error);
              } else {
                console.log(`已压缩: ${file}`);
              }
            });
          }
        }
      });
      
    } catch (error) {
      console.error('压缩日志文件时出错:', error);
    }
  });
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  let daysToKeep = 14;
  let daysToCompress = 7;
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && i + 1 < args.length) {
      daysToKeep = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--compress-days' && i + 1 < args.length) {
      daysToCompress = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  cleanOldLogs(daysToKeep);
  compressOldLogs(daysToCompress);
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main();
}

module.exports = {
  cleanOldLogs,
  compressOldLogs
}; 