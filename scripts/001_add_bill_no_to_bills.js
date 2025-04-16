/**
 * 迁移脚本：为 bills 表添加 bill_no 字段
 */
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function addBillNoToBills() {
  console.log('开始执行迁移：为 bills 表添加 bill_no 字段');

  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // 检查 bill_no 字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bills' AND COLUMN_NAME = 'bill_no'
    `, [process.env.DB_NAME]);

    // 如果字段已存在，则跳过
    if (columns.length > 0) {
      console.log('bill_no 字段已存在，无需添加');
      return;
    }

    // 开始事务
    await connection.beginTransaction();

    // 添加 bill_no 字段
    console.log('添加 bill_no 字段...');
    await connection.query(`
      ALTER TABLE bills
      ADD COLUMN bill_no varchar(64) NOT NULL COMMENT '账单编号' AFTER id
    `);

    // 获取所有账单记录
    const [bills] = await connection.query('SELECT id FROM bills');
    console.log(`需要更新 ${bills.length} 条账单记录...`);

    // 为每条记录生成唯一的账单编号并更新
    for (const bill of bills) {
      const billNo = `BILL${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await connection.query('UPDATE bills SET bill_no = ? WHERE id = ?', [billNo, bill.id]);
    }

    // 添加唯一索引
    console.log('添加唯一索引...');
    await connection.query(`
      ALTER TABLE bills
      ADD UNIQUE INDEX uk_bill_no (bill_no)
    `);

    // 提交事务
    await connection.commit();
    console.log('迁移成功：bills 表已添加 bill_no 字段并更新所有记录');

  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error('迁移失败：', error.message);
    process.exit(1);
  } finally {
    // 关闭连接
    await connection.end();
  }
}

// 执行迁移
addBillNoToBills().catch(err => {
  console.error('迁移过程中出错：', err.message);
  process.exit(1);
}); 