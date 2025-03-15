/**
 * 修复 H5 路由文件中的导入路径
 */
const fs = require('fs');
const path = require('path');

// 源目录
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
    
    // 修复控制器导入路径
    content = content.replace(/require\(['"]\.\.\/\.\.\/controllers\/h5\/([^'"]+)['"]\)/g, "require('../controllers/$1')");
    
    // 修复工具和中间件导入路径
    content = content.replace(/require\(['"]\.\.\/\.\.\/utils\/([^'"]+)['"]\)/g, "require('../../shared/utils/$1')");
    content = content.replace(/require\(['"]\.\.\/\.\.\/middlewares\/([^'"]+)['"]\)/g, "require('../../shared/middlewares/$1')");
    
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
console.log('开始修复 H5 路由文件中的导入路径...');
processDirectory(h5RoutesDir);
console.log('H5 路由文件导入路径修复完成！'); 