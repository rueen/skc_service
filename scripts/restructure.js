/**
 * 项目重构脚本
 * 用于将现有文件移动到新的目录结构
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 源目录和目标目录
const srcDir = path.join(__dirname, '../src');
const adminDir = path.join(srcDir, 'admin');
const h5Dir = path.join(srcDir, 'h5');
const sharedDir = path.join(srcDir, 'shared');

// 确保目录存在
[
  path.join(adminDir, 'routes'),
  path.join(adminDir, 'controllers'),
  path.join(adminDir, 'middlewares'),
  path.join(h5Dir, 'routes'),
  path.join(h5Dir, 'controllers'),
  path.join(h5Dir, 'middlewares'),
  path.join(sharedDir, 'models'),
  path.join(sharedDir, 'utils'),
  path.join(sharedDir, 'config'),
  path.join(sharedDir, 'middlewares'),
  path.join(sharedDir, 'routes')
].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 移动文件的函数
function moveFile(source, destination) {
  try {
    if (fs.existsSync(source)) {
      // 确保目标目录存在
      const destDir = path.dirname(destination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      // 复制文件
      fs.copyFileSync(source, destination);
      console.log(`已复制: ${source} -> ${destination}`);
      
      // 删除源文件
      fs.unlinkSync(source);
      console.log(`已删除: ${source}`);
    } else {
      console.log(`文件不存在: ${source}`);
    }
  } catch (error) {
    console.error(`移动文件失败: ${source} -> ${destination}`, error);
  }
}

// 移动目录的函数
function moveDir(source, destination) {
  try {
    if (fs.existsSync(source)) {
      // 确保目标目录存在
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
      }
      
      // 获取源目录中的所有文件
      const files = fs.readdirSync(source);
      
      // 移动每个文件
      files.forEach(file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
          // 如果是目录，递归移动
          moveDir(sourcePath, destPath);
        } else {
          // 如果是文件，直接移动
          moveFile(sourcePath, destPath);
        }
      });
      
      // 删除源目录（如果为空）
      try {
        fs.rmdirSync(source);
        console.log(`已删除目录: ${source}`);
      } catch (error) {
        console.log(`无法删除目录: ${source}`, error.message);
      }
    } else {
      console.log(`目录不存在: ${source}`);
    }
  } catch (error) {
    console.error(`移动目录失败: ${source} -> ${destination}`, error);
  }
}

// 开始移动文件
console.log('开始重构项目目录...');

// 1. 移动共享文件
console.log('\n移动共享文件...');
moveFile(path.join(srcDir, 'app-common.js'), path.join(sharedDir, 'app-common.js'));
moveDir(path.join(srcDir, 'models'), path.join(sharedDir, 'models'));
moveDir(path.join(srcDir, 'utils'), path.join(sharedDir, 'utils'));
moveDir(path.join(srcDir, 'config'), path.join(sharedDir, 'config'));
moveFile(path.join(srcDir, 'routes/health.routes.js'), path.join(sharedDir, 'routes/health.routes.js'));
moveFile(path.join(srcDir, 'middlewares/errorHandler.middleware.js'), path.join(sharedDir, 'middlewares/errorHandler.middleware.js'));
moveFile(path.join(srcDir, 'middlewares/rateLimiter.middleware.js'), path.join(sharedDir, 'middlewares/rateLimiter.middleware.js'));

// 2. 移动管理后台文件
console.log('\n移动管理后台文件...');
moveFile(path.join(srcDir, 'admin-server.js'), path.join(adminDir, 'admin-server.js'));
moveFile(path.join(srcDir, 'routes/index.js'), path.join(adminDir, 'routes/index.js'));
moveFile(path.join(srcDir, 'routes/auth.routes.js'), path.join(adminDir, 'routes/auth.routes.js'));
moveFile(path.join(srcDir, 'routes/task.routes.js'), path.join(adminDir, 'routes/task.routes.js'));
moveFile(path.join(srcDir, 'routes/member.routes.js'), path.join(adminDir, 'routes/member.routes.js'));
moveFile(path.join(srcDir, 'routes/channel.routes.js'), path.join(adminDir, 'routes/channel.routes.js'));
moveFile(path.join(srcDir, 'routes/waiter.routes.js'), path.join(adminDir, 'routes/waiter.routes.js'));
moveFile(path.join(srcDir, 'routes/article.routes.js'), path.join(adminDir, 'routes/article.routes.js'));
moveFile(path.join(srcDir, 'routes/group.routes.js'), path.join(adminDir, 'routes/group.routes.js'));
moveFile(path.join(srcDir, 'routes/upload.routes.js'), path.join(adminDir, 'routes/upload.routes.js'));

moveFile(path.join(srcDir, 'controllers/auth.controller.js'), path.join(adminDir, 'controllers/auth.controller.js'));
moveFile(path.join(srcDir, 'controllers/task.controller.js'), path.join(adminDir, 'controllers/task.controller.js'));
moveFile(path.join(srcDir, 'controllers/member.controller.js'), path.join(adminDir, 'controllers/member.controller.js'));
moveFile(path.join(srcDir, 'controllers/channel.controller.js'), path.join(adminDir, 'controllers/channel.controller.js'));
moveFile(path.join(srcDir, 'controllers/waiter.controller.js'), path.join(adminDir, 'controllers/waiter.controller.js'));
moveFile(path.join(srcDir, 'controllers/article.controller.js'), path.join(adminDir, 'controllers/article.controller.js'));
moveFile(path.join(srcDir, 'controllers/group.controller.js'), path.join(adminDir, 'controllers/group.controller.js'));
moveFile(path.join(srcDir, 'controllers/upload.controller.js'), path.join(adminDir, 'controllers/upload.controller.js'));

moveFile(path.join(srcDir, 'middlewares/auth.middleware.js'), path.join(adminDir, 'middlewares/auth.middleware.js'));

// 3. 移动H5端文件
console.log('\n移动H5端文件...');
moveFile(path.join(srcDir, 'h5-server.js'), path.join(h5Dir, 'h5-server.js'));
moveDir(path.join(srcDir, 'routes/h5'), path.join(h5Dir, 'routes'));
moveDir(path.join(srcDir, 'controllers/h5'), path.join(h5Dir, 'controllers'));
moveFile(path.join(srcDir, 'middlewares/h5Auth.middleware.js'), path.join(h5Dir, 'middlewares/h5Auth.middleware.js'));

console.log('\n项目目录重构完成！');
console.log('请检查新的目录结构，并更新相关的导入路径。'); 