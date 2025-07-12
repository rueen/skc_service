/**
 * 迁移脚本：创建任务组相关表
 * @description 为任务组功能创建必要的数据库表
 * @author diaochan  
 * @date 2024-01-XX
 */
// 加载环境变量
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv 模块未安装或 .env 文件不存在，使用默认配置');
}

const { pool } = require('../src/shared/models/db');
const { logger } = require('../src/shared/config/logger.config');

// 创建任务组表
const createTaskGroupsTable = `
CREATE TABLE IF NOT EXISTS task_groups (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '任务组ID',
  task_group_name varchar(100) NOT NULL COMMENT '任务组名称',
  task_group_reward decimal(10,2) NOT NULL COMMENT '任务组奖励金额',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_group_name (task_group_name),
  KEY idx_create_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务组表';
`;

// 创建任务-任务组关联表
const createTaskTaskGroupsTable = `
CREATE TABLE IF NOT EXISTS task_task_groups (
  id bigint(20) NOT NULL AUTO_INCREMENT COMMENT '关联ID',
  task_id bigint(20) NOT NULL COMMENT '任务ID',
  task_group_id bigint(20) NOT NULL COMMENT '任务组ID',
  create_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  update_time datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_id (task_id) COMMENT '确保一个任务只能属于一个任务组',
  KEY idx_task_group_id (task_group_id),
  KEY idx_task_id (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务-任务组关联表';
`;

/**
 * 创建任务组相关表
 */
async function createTaskGroupTables() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始创建任务组相关表...');
    console.log('开始创建任务组相关表...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 创建任务组表
    await connection.query(createTaskGroupsTable);
    console.log('✓ task_groups 表创建成功');
    
    // 创建任务-任务组关联表
    await connection.query(createTaskTaskGroupsTable);
    console.log('✓ task_task_groups 表创建成功');
    
    // 提交事务
    await connection.commit();
    
    logger.info('任务组相关表创建完成');
    console.log('✓ 任务组相关表创建完成');
    return true;
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`创建任务组表失败: ${error.message}`);
    console.error('✗ 创建任务组表失败:', error.message);
    return false;
  } finally {
    connection.release();
  }
}

// 运行迁移
if (require.main === module) {
  createTaskGroupTables()
    .then((success) => {
      if (success) {
        console.log('迁移脚本执行成功');
        process.exit(0);
      } else {
        console.error('迁移脚本执行失败');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('迁移脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createTaskGroupTables }; 