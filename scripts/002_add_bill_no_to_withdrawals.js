/**
 * 迁移脚本：为 withdrawals 表添加 bill_no 字段并与 bills 表关联
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function addBillNoToWithdrawals() {
  console.log('开始执行迁移：为 withdrawals 表添加 bill_no 字段并与 bills 表关联');

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
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'withdrawals' AND COLUMN_NAME = 'bill_no'
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
      ALTER TABLE withdrawals
      ADD COLUMN bill_no varchar(64) NOT NULL COMMENT '账单编号，与bills表关联' AFTER id
    `);

    // 获取所有提现记录
    const [withdrawals] = await connection.query('SELECT id FROM withdrawals');
    console.log(`需要更新 ${withdrawals.length} 条提现记录...`);

    // 检查 bills 表中是否有 bill_no 字段
    const [billsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'bills' AND COLUMN_NAME = 'bill_no'
    `, [process.env.DB_NAME]);

    const billsHasBillNo = billsColumns.length > 0;

    // 更新每条提现记录的 bill_no
    for (const withdrawal of withdrawals) {
      let billNo;

      // 如果 bills 表中有 bill_no 字段，尝试获取关联的 bill_no
      if (billsHasBillNo) {
        const [relatedBills] = await connection.query(`
          SELECT bill_no FROM bills 
          WHERE withdrawal_id = ? AND bill_type = 'withdrawal'
          LIMIT 1
        `, [withdrawal.id]);

        if (relatedBills.length > 0 && relatedBills[0].bill_no) {
          billNo = relatedBills[0].bill_no;
          console.log(`找到提现ID ${withdrawal.id} 关联的账单编号 ${billNo}`);
        }
      }

      // 如果没有找到关联的 bill_no，生成一个新的
      if (!billNo) {
        billNo = `WIT${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        console.log(`为提现ID ${withdrawal.id} 生成新的账单编号 ${billNo}`);
        
        // 如果 bills 表有关联记录但没有 bill_no，更新 bills 表
        if (billsHasBillNo) {
          await connection.query(`
            UPDATE bills SET bill_no = ?
            WHERE withdrawal_id = ? AND bill_type = 'withdrawal' AND (bill_no IS NULL OR bill_no = '')
          `, [billNo, withdrawal.id]);
        }
      }

      // 更新提现记录的 bill_no
      await connection.query('UPDATE withdrawals SET bill_no = ? WHERE id = ?', [billNo, withdrawal.id]);
    }

    // 添加唯一索引
    console.log('添加唯一索引...');
    await connection.query(`
      ALTER TABLE withdrawals
      ADD UNIQUE INDEX uk_bill_no (bill_no)
    `);

    // 提交事务
    await connection.commit();
    console.log('迁移成功：withdrawals 表已添加 bill_no 字段并更新所有记录');

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
addBillNoToWithdrawals().catch(err => {
  console.error('迁移过程中出错：', err.message);
  process.exit(1);
}); 