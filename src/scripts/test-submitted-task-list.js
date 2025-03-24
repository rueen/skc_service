/**
 * 测试已提交任务列表查询
 * 用于验证修复重复数据问题
 * 执行方法: node src/scripts/test-submitted-task-list.js
 */

const submittedTaskModel = require('../shared/models/submitted-task.model');
const logger = require('../shared/config/logger.config');

/**
 * 测试获取已提交任务列表
 */
async function testGetSubmittedTaskList() {
  try {
    console.log('开始测试已提交任务列表查询...');
    
    // 1. 不带过滤条件的查询
    const result1 = await submittedTaskModel.getList();
    console.log('查询1（无过滤条件）：');
    console.log(`- 总记录数：${result1.total}`);
    console.log(`- 当前页记录数：${result1.list.length}`);
    
    // 检查是否有重复ID
    const ids1 = result1.list.map(item => item.id);
    const uniqueIds1 = [...new Set(ids1)];
    console.log(`- 不同ID数量：${uniqueIds1.length}`);
    if (ids1.length !== uniqueIds1.length) {
      console.log('警告: 查询结果中存在重复的ID!');
    } else {
      console.log('成功: 查询结果中所有ID都是唯一的');
    }
    
    // 2. 带状态过滤条件的查询
    const result2 = await submittedTaskModel.getList({ taskAuditStatus: 'pending' });
    console.log('\n查询2（状态=pending）：');
    console.log(`- 总记录数：${result2.total}`);
    console.log(`- 当前页记录数：${result2.list.length}`);
    
    // 检查是否有重复ID
    const ids2 = result2.list.map(item => item.id);
    const uniqueIds2 = [...new Set(ids2)];
    console.log(`- 不同ID数量：${uniqueIds2.length}`);
    if (ids2.length !== uniqueIds2.length) {
      console.log('警告: 查询结果中存在重复的ID!');
    } else {
      console.log('成功: 查询结果中所有ID都是唯一的');
    }
    
    // 3. 如果有群组数据，测试群组筛选
    try {
      // 获取第一个有群组的提交任务
      const taskWithGroup = result1.list.find(item => item.groupId);
      if (taskWithGroup) {
        const result3 = await submittedTaskModel.getList({ groupId: taskWithGroup.groupId });
        console.log(`\n查询3（群组ID=${taskWithGroup.groupId}）：`);
        console.log(`- 总记录数：${result3.total}`);
        console.log(`- 当前页记录数：${result3.list.length}`);
        
        // 检查是否有重复ID
        const ids3 = result3.list.map(item => item.id);
        const uniqueIds3 = [...new Set(ids3)];
        console.log(`- 不同ID数量：${uniqueIds3.length}`);
        if (ids3.length !== uniqueIds3.length) {
          console.log('警告: 查询结果中存在重复的ID!');
        } else {
          console.log('成功: 查询结果中所有ID都是唯一的');
        }
      } else {
        console.log('\n跳过群组筛选测试：没有找到有群组信息的任务提交');
      }
    } catch (error) {
      console.log(`\n群组筛选测试失败: ${error.message}`);
    }
    
    console.log('\n测试完成！');
  } catch (error) {
    console.error(`测试失败: ${error.message}`);
  }
}

// 执行测试
testGetSubmittedTaskList()
  .then(() => {
    console.log('测试脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error(`测试脚本执行失败: ${error.message}`);
    process.exit(1);
  }); 