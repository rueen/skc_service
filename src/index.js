/*
 * @Author: diaochan
 * @Date: 2025-03-19 15:32:32
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-19 19:34:52
 * @Description: 
 */
// 初始化数据库表
const { initTables } = require('./shared/models/init.db');

// 导入迁移函数
const { migrateMemberGroups } = require('./shared/models/migration');
// 导入同步函数
const { syncMemberGroups, syncGroupOwnerStatus } = require('./shared/models/sync-member-groups');
// 导入冗余字段迁移函数
const { removeRedundantFields } = require('./shared/models/migration-remove-redundant');
// 导入修复member_groups表约束的函数
const { fixMemberGroupsConstraint } = require('./shared/models/db-fix-member-groups');

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
    
    // 执行会员群组关系同步
    const syncResult = await syncMemberGroups();
    if (syncResult.success) {
      console.log(`会员群组关系同步完成，同步了 ${syncResult.syncedCount} 条记录，${syncResult.syncedOwnersCount} 个群主状态，${syncResult.syncedGroupsCount} 个群组owner_id`);
    } else {
      console.error('会员群组关系同步失败:', syncResult.error);
    }
    
    // 执行冗余字段迁移
    const redundantFieldsResult = await removeRedundantFields();
    if (redundantFieldsResult.success) {
      console.log('冗余字段迁移完成:', redundantFieldsResult.message);
    } else {
      console.error('冗余字段迁移失败:', redundantFieldsResult.message);
    }
    
    // 修复member_groups表约束
    const fixConstraintResult = await fixMemberGroupsConstraint();
    if (fixConstraintResult.success) {
      console.log('member_groups表约束修复完成:', fixConstraintResult.message);
    } else {
      console.error('member_groups表约束修复失败:', fixConstraintResult.message);
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