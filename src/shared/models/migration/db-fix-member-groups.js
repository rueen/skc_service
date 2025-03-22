/**
 * 修复member_groups表约束的脚本
 * 将member_id的唯一约束修改为member_id和group_id的联合唯一约束
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 修复member_groups表约束
 */
async function fixMemberGroupsConstraint() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始修复member_groups表约束...');
    
    // 获取表的所有索引信息
    const [indexes] = await connection.query(`
      SHOW INDEX FROM member_groups
      WHERE Key_name = 'uk_member_id'
    `);
    
    if (indexes.length > 0) {
      logger.info('找到uk_member_id约束，准备删除...');
      
      // 使用事务确保安全
      await connection.beginTransaction();
      
      try {
        // 删除原来的唯一约束
        await connection.query(`
          ALTER TABLE member_groups
          DROP INDEX uk_member_id
        `);
        
        logger.info('uk_member_id约束删除成功');
        
        // 添加新的联合唯一约束
        await connection.query(`
          ALTER TABLE member_groups
          ADD CONSTRAINT uk_member_group UNIQUE (member_id, group_id)
        `);
        
        logger.info('uk_member_group联合唯一约束添加成功');
        
        await connection.commit();
        
        return {
          success: true,
          message: 'member_groups表约束修复成功'
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } else {
      // 检查是否已经有了联合唯一约束
      const [newIndexes] = await connection.query(`
        SHOW INDEX FROM member_groups
        WHERE Key_name = 'uk_member_group'
      `);
      
      if (newIndexes.length > 0) {
        logger.info('uk_member_group联合唯一约束已存在，无需修复');
        return {
          success: true,
          message: 'member_groups表约束已符合要求，无需修复'
        };
      } else {
        // 添加新的联合唯一约束
        await connection.query(`
          ALTER TABLE member_groups
          ADD CONSTRAINT uk_member_group UNIQUE (member_id, group_id)
        `);
        
        logger.info('uk_member_group联合唯一约束添加成功');
        
        return {
          success: true,
          message: 'member_groups表约束修复成功'
        };
      }
    }
  } catch (error) {
    logger.error(`修复member_groups表约束失败: ${error.message}`);
    return {
      success: false,
      message: error.message
    };
  } finally {
    connection.release();
  }
}

// 如果直接运行此脚本，则执行修复
if (require.main === module) {
  fixMemberGroupsConstraint()
    .then(result => {
      if (result.success) {
        logger.info(`修复成功: ${result.message}`);
      } else {
        logger.error(`修复失败: ${result.message}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      logger.error(`修复过程中发生错误: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  fixMemberGroupsConstraint
}; 