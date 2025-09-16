/**
 * 会员表添加Line字段迁移脚本
 * 为members表添加line字段，并处理老数据
 * 
 * ⚠️  重要提醒：
 * 1. 此脚本会对members表加排他锁，可能导致业务接口503错误
 * 2. 建议在低峰期或维护窗口期执行
 * 3. 大表（>10万记录）建议启用维护模式
 */
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { pool } = require('../src/shared/models/db');
const { logger } = require('../src/shared/config/logger.config');

async function migrate() {
  const connection = await pool.getConnection();
  try {
    console.log('开始执行members表Line字段迁移...');
    
    // 检查表记录数量，评估迁移风险
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM members');
    const recordCount = countResult[0].count;
    console.log(`当前members表记录数：${recordCount}`);
    
    if (recordCount > 100000) {
      console.warn('⚠️  警告：表记录数超过10万，建议在维护模式下执行此迁移！');
      console.warn('    ALTER TABLE操作可能需要数分钟，会阻塞所有业务请求！');
    }
    
    await connection.beginTransaction();
    
    // 检查字段是否已存在
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'members' 
        AND COLUMN_NAME = 'line'
    `);
    
    if (columns.length > 0) {
      console.log('line字段已存在，跳过添加');
      await connection.commit();
      return true;
    }
    
    // 添加line字段
    console.log('添加line字段...');
    await connection.query(`
      ALTER TABLE members 
      ADD COLUMN line varchar(50) DEFAULT NULL 
      COMMENT 'Line账号' 
      AFTER telegram
    `);
    
    console.log('line字段添加成功');
    
    // 注释：移除不必要的UPDATE操作
    // 由于新添加的字段默认值已设为NULL，无需额外更新
    console.log('字段已设置默认值为NULL，无需处理老数据');
    
    await connection.commit();
    console.log('members表Line字段迁移完成');
    
    return true;
  } catch (error) {
    await connection.rollback();
    console.error(`迁移失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
migrate()
  .then(() => {
    console.log('迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
