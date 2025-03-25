/**
 * 测试脚本：测试bills表的related_group_id字段插入
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testBillInsert() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // 注意这里是空字符串，不是null
    database: process.env.DB_NAME || 'skc'
  };
  
  console.log('开始测试bills表的related_group_id字段插入');
  console.log('数据库配置:', connectionConfig);
  
  let connection;
  try {
    // 创建数据库连接
    connection = await mysql.createConnection(connectionConfig);
    console.log('数据库连接成功');
    
    // 检查bills表结构
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM bills
    `);
    
    console.log('bills表结构:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // 查询一条bills记录作为示例
    const [bills] = await connection.query(`
      SELECT * FROM bills LIMIT 1
    `);
    
    if (bills.length > 0) {
      console.log('示例账单记录:', JSON.stringify(bills[0], null, 2));
    } else {
      console.log('bills表中没有记录');
    }
    
    // 测试插入带有related_group_id的记录
    const testGroupId = 999;
    const [insertResult] = await connection.query(`
      INSERT INTO bills 
      (member_id, bill_type, amount, settlement_status, task_id, related_member_id, related_group_id) 
      VALUES (1, 'test_insert', 0.01, 'pending', 1, NULL, ?)
    `, [testGroupId]);
    
    console.log('测试记录插入结果:', insertResult);
    
    // 查询刚插入的记录
    const [newBill] = await connection.query(`
      SELECT * FROM bills WHERE id = ?
    `, [insertResult.insertId]);
    
    console.log('插入的测试记录:', JSON.stringify(newBill[0], null, 2));
    
    // 删除测试记录
    await connection.query(`
      DELETE FROM bills WHERE id = ?
    `, [insertResult.insertId]);
    
    console.log('测试记录已删除');
    
    // 检查reward.model.js中的createBill函数调用情况
    console.log('\n现在检查最近插入的实际账单记录...');
    
    const [recentBills] = await connection.query(`
      SELECT id, member_id, bill_type, amount, related_group_id, create_time 
      FROM bills 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log('最近10条账单记录:');
    recentBills.forEach(bill => {
      console.log(`ID: ${bill.id}, 会员ID: ${bill.member_id}, 类型: ${bill.bill_type}, 金额: ${bill.amount}, 关联群组ID: ${bill.related_group_id}, 创建时间: ${bill.create_time}`);
    });
    
    console.log('测试完成: 数据库结构正常，可以存储related_group_id');
    return true;
  } catch (error) {
    console.error(`测试失败: ${error.message}`);
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行测试
testBillInsert()
  .then(success => {
    if (success) {
      console.log('测试成功完成');
      process.exit(0);
    } else {
      console.error('测试失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`执行测试时发生错误: ${error.message}`);
    process.exit(1);
  }); 