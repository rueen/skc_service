/**
 * 冗余字段迁移脚本
 * 用于完全迁移到关联表并删除members表中的冗余字段
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 迁移数据并删除冗余字段
 */
async function removeRedundantFields() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始移除冗余字段迁移...');
    
    // 1. 确保所有数据已同步到关联表
    logger.info('确保所有数据已同步到关联表...');
    const [unsynced] = await connection.query(`
      SELECT m.id, m.member_nickname, m.group_id, m.is_group_owner
      FROM members m
      LEFT JOIN member_groups mg ON m.id = mg.member_id AND m.group_id = mg.group_id
      WHERE m.group_id IS NOT NULL 
      AND mg.id IS NULL
    `);
    
    if (unsynced.length > 0) {
      logger.info(`找到 ${unsynced.length} 条未同步的会员群组关系，正在同步...`);
      
      // 准备批量插入的数据
      const values = unsynced.map(m => [
        m.id,              // member_id
        m.group_id,        // group_id
        m.is_group_owner   // is_owner
      ]);
      
      // 执行批量插入
      await connection.query(`
        INSERT INTO member_groups 
        (member_id, group_id, is_owner)
        VALUES ?
      `, [values]);
    }
    
    // 2. 同步群主状态
    logger.info('同步群主状态...');
    const [membersToSync] = await connection.query(`
      SELECT m.id, m.group_id, m.is_group_owner
      FROM members m
      JOIN member_groups mg ON m.id = mg.member_id AND m.group_id = mg.group_id
      WHERE m.is_group_owner != mg.is_owner
    `);
    
    if (membersToSync.length > 0) {
      logger.info(`找到 ${membersToSync.length} 条需要同步群主状态的记录，正在同步...`);
      
      for (const member of membersToSync) {
        await connection.query(`
          UPDATE member_groups 
          SET is_owner = ?
          WHERE member_id = ? AND group_id = ?
        `, [member.is_group_owner, member.id, member.group_id]);
      }
    }
    
    // 3. 检查是否可以安全删除冗余字段
    logger.info('检查是否可以安全删除冗余字段...');
    
    // 检查是否有未同步的数据
    const [remainingUnsynced] = await connection.query(`
      SELECT COUNT(*) as count
      FROM members m
      LEFT JOIN member_groups mg ON m.id = mg.member_id AND m.group_id = mg.group_id
      WHERE m.group_id IS NOT NULL 
      AND mg.id IS NULL
    `);
    
    if (remainingUnsynced[0].count > 0) {
      throw new Error(`仍有 ${remainingUnsynced[0].count} 条记录未同步到关联表，无法安全删除冗余字段`);
    }
    
    // 检查是否有群主状态不一致的数据
    const [remainingInconsistent] = await connection.query(`
      SELECT COUNT(*) as count
      FROM members m
      JOIN member_groups mg ON m.id = mg.member_id AND m.group_id = mg.group_id
      WHERE m.is_group_owner != mg.is_owner
    `);
    
    if (remainingInconsistent[0].count > 0) {
      throw new Error(`仍有 ${remainingInconsistent[0].count} 条记录的群主状态不一致，无法安全删除冗余字段`);
    }
    
    // 4. 删除冗余字段
    logger.info('删除members表中的冗余字段...');
    
    // 使用事务确保安全
    await connection.beginTransaction();
    
    try {
      // 删除group_id列
      await connection.query(`
        ALTER TABLE members 
        DROP COLUMN group_id
      `);
      
      // 删除is_group_owner列
      await connection.query(`
        ALTER TABLE members 
        DROP COLUMN is_group_owner
      `);
      
      await connection.commit();
      logger.info('冗余字段已成功删除');
      
      return {
        success: true,
        message: '冗余字段迁移完成，group_id和is_group_owner字段已删除'
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`冗余字段迁移失败: ${error.message}`);
    return {
      success: false,
      message: error.message
    };
  } finally {
    connection.release();
  }
}

// 如果直接运行此脚本，则执行迁移
if (require.main === module) {
  removeRedundantFields()
    .then(result => {
      if (result.success) {
        logger.info(`冗余字段迁移成功: ${result.message}`);
      } else {
        logger.error(`冗余字段迁移失败: ${result.message}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      logger.error(`冗余字段迁移过程中发生错误: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  removeRedundantFields
}; 