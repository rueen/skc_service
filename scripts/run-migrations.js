/*
 * @Author: diaochan
 * @Date: 2025-04-11 11:35:44
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-08 15:22:30
 * @Description: 
 */
/**
 * 运行所有迁移脚本
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 获取scripts目录下的所有迁移脚本
console.log('正在查找迁移脚本...');
const scriptsDir = __dirname;
const migrationFiles = fs.readdirSync(scriptsDir)
  .filter(file => file.match(/^\d{3}.*\.js$/)) // 匹配以三位数字开头的JS文件
  .sort(); // 按文件名排序

if (migrationFiles.length === 0) {
  console.log('没有找到迁移脚本，无需执行');
  process.exit(0);
}

console.log(`找到 ${migrationFiles.length} 个迁移脚本待执行`);

// 依次执行每个脚本
let success = true;
for (const file of migrationFiles) {
  const filePath = path.join(scriptsDir, file);
  
  console.log(`\n正在执行迁移脚本: ${file}`);
  try {
    execSync(`node ${filePath}`, { stdio: 'inherit' });
    console.log(`脚本 ${file} 执行成功\n`);
  } catch (error) {
    console.error(`脚本 ${file} 执行失败: ${error.message}\n`);
    success = false;
    break;
  }
}

if (success) {
  console.log('所有迁移脚本执行成功');
  process.exit(0);
} else {
  console.error('迁移过程中出现错误，已中止');
  process.exit(1);
} 