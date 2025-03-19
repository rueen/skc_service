/*
 * @Author: diaochan
 * @Date: 2025-03-19 15:32:32
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-19 18:46:43
 * @Description: 
 */
// 初始化数据库表
const { initTables } = require('./shared/models/init.db');

// 导入迁移函数
const { migrateMemberGroups } = require('./shared/models/migration');

// 启动应用前初始化数据库
async function initDatabase() {
  try {
    // 初始化数据库表
    await initTables();
    console.log('数据库表初始化完成');
    
    // 执行数据迁移
    const migrationResult = await migrateMemberGroups();
    if (migrationResult.success) {
      console.log('数据迁移完成:', migrationResult.message);
    } else {
      console.error('数据迁移失败:', migrationResult.message);
    }
    
    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return false;
  }
}

// 启动应用
async function startApp() {
  try {
    // 初始化数据库
    const dbInitResult = await initDatabase();
    if (!dbInitResult) {
      console.error('由于数据库初始化失败，应用启动终止');
      process.exit(1);
    }
    
    // 启动服务器
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
    });
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}

startApp(); 