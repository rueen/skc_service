/**
 * 为 withdrawal_accounts 表新增银行相关字段
 * 迁移脚本 006
 */
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { pool } = require('../src/shared/models/db');
const { logger } = require('../src/shared/config/logger.config');

/**
 * 执行迁移
 */
async function runMigration() {
  const connection = await pool.getConnection();
  try {
    console.log('开始执行迁移脚本 006...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'withdrawal_accounts' 
        AND COLUMN_NAME IN ('bank_name', 'bank_branch_name', 'bank_account_nature')
    `);
    
    const existingFields = columns.map(col => col.COLUMN_NAME);
    const fieldsToAdd = [];
    
    if (!existingFields.includes('bank_name')) {
      fieldsToAdd.push('bank_name varchar(100) DEFAULT NULL COMMENT \'银行名称\'');
    }
    
    if (!existingFields.includes('bank_branch_name')) {
      fieldsToAdd.push('bank_branch_name varchar(100) DEFAULT NULL COMMENT \'银行分行名称\'');
    }
    
    if (!existingFields.includes('bank_account_nature')) {
      fieldsToAdd.push('bank_account_nature varchar(50) DEFAULT NULL COMMENT \'银行账户性质\'');
    }
    
    if (fieldsToAdd.length === 0) {
      console.log('所有银行字段已存在，跳过此次迁移');
      await connection.commit();
      return true;
    }
    
    // 为 withdrawal_accounts 表新增银行字段
    console.log('添加银行相关字段...');
    for (const field of fieldsToAdd) {
      await connection.query(`
        ALTER TABLE withdrawal_accounts 
        ADD COLUMN ${field}
      `);
      console.log(`已添加字段: ${field.split(' ')[0]}`);
    }
    
    console.log('已为 withdrawal_accounts 表新增银行相关字段');
    
    // 提交事务
    await connection.commit();
    console.log('迁移脚本 006 执行成功');
    
    return true;
  } catch (error) {
    await connection.rollback();
    console.error(`迁移脚本 006 执行失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
