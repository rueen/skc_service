/**
 * 迁移脚本：为系统配置表添加任务驳回次数配置
 * @Author: assistant
 * @Date: 2025-01-11
 * @Description: 添加 task_reject_times 系统配置项
 */

// 尝试加载环境变量
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
    logger.info('开始执行迁移：添加任务驳回次数配置到 system_config 表');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 检查配置项是否已存在
    const [existing] = await connection.query(
      'SELECT id FROM system_config WHERE config_key = ?',
      ['task_reject_times']
    );
    
    if (existing.length === 0) {
      // 添加新的系统配置项
      await connection.query(`
        INSERT INTO system_config (config_key, config_value, description) 
        VALUES ('task_reject_times', '-1', '任务可驳回次数，-1:不限制；0:驳回后不可提交；1:驳回后可提交1次，再次驳回不可提交；')
      `);
      logger.info('成功添加 task_reject_times 系统配置项');
    } else {
      logger.info('task_reject_times 配置项已存在，跳过添加');
    }
    
    // 提交事务
    await connection.commit();
    
    logger.info('迁移执行完成：任务驳回次数配置已添加到 system_config 表');
    return true;
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`迁移执行失败: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
}

// 执行迁移
async function run() {
  try {
    await migrate();
    console.log('✅ 迁移脚本执行成功');
    process.exit(0);
  } catch (error) {
    console.error('❌ 迁移脚本执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行迁移
if (require.main === module) {
  run();
}

module.exports = { migrate }; 