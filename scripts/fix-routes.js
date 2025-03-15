/**
 * 修复路由文件中的导入路径
 */
const fs = require('fs');
const path = require('path');

// 源目录
const adminRoutesDir = path.join(__dirname, '../src/admin/routes');
const h5RoutesDir = path.join(__dirname, '../src/h5/routes');

// 修复文件中的导入路径
function fixImportsInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`文件不存在: ${filePath}`);
      return;
    }

    // 读取文件内容
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 修复错误的导入路径 - 处理 ['"] 格式
    content = content.replace(/require\(\['"]\.\.\/\.\.\/shared\/middlewares\/auth\.middleware['"]\)/g, "require('../middlewares/auth.middleware')");
    content = content.replace(/require\(\['"]\.\.\/\.\.\/shared\/middlewares\/h5Auth\.middleware['"]\)/g, "require('../middlewares/h5Auth.middleware')");
    content = content.replace(/require\(\['"]\.\.\/\.\.\/shared\/middlewares\/rateLimiter\.middleware['"]\)/g, "require('../../shared/middlewares/rateLimiter.middleware')");
    content = content.replace(/require\(\['"]\.\.\/\.\.\/shared\/utils\/validator\.util['"]\)/g, "require('../../shared/utils/validator.util')");
    
    // 更简单的方法：直接替换所有 ['"] 为单引号
    content = content.replace(/require\(\['"]/g, "require('");
    content = content.replace(/['"]\)/g, "')");
    
    // 写入文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`已修复导入路径: ${filePath}`);
  } catch (error) {
    console.error(`修复文件导入路径失败: ${filePath}`, error);
  }
}

// 处理目录中的所有JS文件
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
console.log('开始修复路由文件中的导入路径...');
processDirectory(adminRoutesDir);
processDirectory(h5RoutesDir);
console.log('路由文件导入路径修复完成！'); 