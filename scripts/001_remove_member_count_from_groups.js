/*
 * @Author: diaochan
 * @Date: 2025-04-19 10:36:49
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-19 10:54:27
 * @Description: 
 */
/**
 * 迁移脚本：从groups表中移除member_count字段
 * 目的：
 * 1. 确保数据一致性
 * 2. 减少维护成本
 * 3. 降低代码复杂度
 * 
 * 所有需要获取群组成员数量的地方，应该通过查询member_groups表获取
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateTables() {
  console.log('开始执行迁移脚本: 从groups表中移除member_count字段');

  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  try {
    // 检查字段是否存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'groups' 
        AND COLUMN_NAME = 'member_count'
    `, [process.env.DB_NAME]);
    
    // 如果字段存在则删除
    if (columns.length > 0) {
      // 开始事务
      await connection.beginTransaction();
      
      console.log('从groups表中移除member_count字段...');
      // 执行删除字段的操作
      await connection.query(`
        ALTER TABLE \`groups\` 
        DROP COLUMN \`member_count\`
      `);
      
      // 提交事务
      await connection.commit();
      
      console.log('成功从groups表中移除member_count字段');
    } else {
      console.log('member_count字段不存在，无需删除');
    }
    
    return true;
  } catch (error) {
    // 回滚事务
    if (connection) {
      await connection.rollback();
    }
    
    console.error(`迁移失败: ${error.message}`);
    return false;
  } finally {
    // 关闭连接
    await connection.end();
  }
}

// 执行迁移
migrateTables()
  .then(success => {
    if (success) {
      console.log('迁移脚本执行完成');
      process.exit(0);
    } else {
      console.error('迁移脚本执行失败');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`执行迁移脚本时发生错误: ${error.message}`);
    process.exit(1);
  }); 