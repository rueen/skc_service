/**
 * 运行创建任务报名表的迁移脚本
 */
const createTaskApplicationTable = require('./src/shared/models/migration/create-task-application-table');

async function run() {
  try {
    console.log('开始创建任务报名表...');
    await createTaskApplicationTable();
    console.log('任务报名表创建成功！');
    process.exit(0);
  } catch (error) {
    console.error('创建任务报名表失败:', error.message);
    process.exit(1);
  }
}

run(); 