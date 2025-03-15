/**
 * 修复导入路径脚本
 * 用于修复所有文件中的导入路径
 */
const fs = require('fs');
const path = require('path');

// 源目录
const adminDir = path.join(__dirname, '../src/admin');
const h5Dir = path.join(__dirname, '../src/h5');

// 需要替换的路径映射
const pathMappings = [
  { from: '../models/', to: '../../shared/models/' },
  { from: '../utils/', to: '../../shared/utils/' },
  { from: '../config/', to: '../../shared/config/' },
  { from: '../middlewares/rateLimiter.middleware', to: '../../shared/middlewares/rateLimiter.middleware' },
  { from: '../middlewares/errorHandler.middleware', to: '../../shared/middlewares/errorHandler.middleware' },
  { from: './models/', to: '../shared/models/' },
  { from: './utils/', to: '../shared/utils/' },
  { from: './config/', to: '../shared/config/' },
  { from: './middlewares/rateLimiter.middleware', to: '../shared/middlewares/rateLimiter.middleware' },
  { from: './middlewares/errorHandler.middleware', to: '../shared/middlewares/errorHandler.middleware' },
  { from: './routes/health.routes', to: '../shared/routes/health.routes' }
];

// 修复文件中的导入路径
function fixImportsInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`文件不存在: ${filePath}`);
      return;
    }

    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;
    
    // 应用路径映射
    pathMappings.forEach(mapping => {
      // 检查是否包含需要替换的路径
      if (content.includes(`require('${mapping.from}`) || content.includes(`require("${mapping.from}`)) {
        // 替换单引号版本
        content = content.replace(
          new RegExp(`require\\('${mapping.from}`, 'g'), 
          `require('${mapping.to}`
        );
        
        // 替换双引号版本
        content = content.replace(
          new RegExp(`require\\("${mapping.from}`, 'g'), 
          `require("${mapping.to}`
        );
        
        modified = true;
      }
    });
    
    // 如果内容有变化，写入文件
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`已修复导入路径: ${filePath}`);
    }
  } catch (error) {
    console.error(`修复文件导入路径失败: ${filePath}`, error);
  }
}

// 递归处理目录中的所有JS文件
function processDirectory(directory) {
  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      
      if (fs.statSync(filePath).isDirectory()) {
        // 如果是目录，递归处理
        processDirectory(filePath);
      } else if (path.extname(file) === '.js') {
        // 如果是JS文件，修复导入路径
        fixImportsInFile(filePath);
      }
    });
  } catch (error) {
    console.error(`处理目录失败: ${directory}`, error);
  }
}

// 开始处理
console.log('开始修复导入路径...');
processDirectory(adminDir);
processDirectory(h5Dir);
console.log('导入路径修复完成！'); 