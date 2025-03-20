/**
 * 会员群组关系同步脚本
 * 用于定期检查和同步会员群组关系数据
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 检查未同步的会员群组关系
 */
async function checkUnsyncedMembersGroups() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始检查未同步的会员群组关系...');
    
    // 查找groups表中有owner_id但member_groups表中没有对应记录的情况
    const [unsynced] = await connection.query(`
      SELECT g.id as group_id, g.owner_id as member_id, 1 as is_group_owner
      FROM \`groups\` g
      LEFT JOIN member_groups mg ON g.owner_id = mg.member_id AND g.id = mg.group_id
      WHERE g.owner_id IS NOT NULL 
      AND mg.id IS NULL
    `);
    
    logger.info(`找到 ${unsynced.length} 条未同步的会员群组关系`);
    
    if (unsynced.length > 0) {
      // 准备批量插入的数据
      const values = unsynced.map(m => [
        m.member_id,       // member_id
        m.group_id,        // group_id
        m.is_group_owner   // is_owner
      ]);
      
      // 执行批量插入
      const [result] = await connection.query(`
        INSERT INTO member_groups 
        (member_id, group_id, is_owner)
        VALUES ?
      `, [values]);
      
      logger.info(`成功同步 ${result.affectedRows} 条会员群组关系`);
      
      // 更新群组的成员数量
      await connection.query(`
        UPDATE \`groups\` g
        SET member_count = (
          SELECT COUNT(*) 
          FROM member_groups mg 
          WHERE mg.group_id = g.id
        )
      `);
      
      logger.info('群组成员数量已更新');
    } else {
      logger.info('没有需要同步的会员群组关系');
    }
    
    return {
      success: true,
      syncedCount: unsynced.length
    };
  } catch (error) {
    logger.error(`同步会员群组关系失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

/**
 * 同步群主状态信息
 * 确保members表和member_groups表中的群主状态一致
 */
async function syncGroupOwnerStatus() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始同步群主状态信息...');
    
    // 1. 确保groups表中的owner_id在member_groups表中有对应记录，并且is_owner为1
    const [ownersToSync] = await connection.query(`
      SELECT g.id as group_id, g.owner_id as member_id
      FROM \`groups\` g
      LEFT JOIN member_groups mg ON g.owner_id = mg.member_id AND g.id = mg.group_id
      WHERE g.owner_id IS NOT NULL 
      AND (mg.id IS NULL OR mg.is_owner = 0)
    `);
    
    logger.info(`找到 ${ownersToSync.length} 条需要同步群主状态的记录`);
    
    let updatedCount = 0;
    if (ownersToSync.length > 0) {
      for (const owner of ownersToSync) {
        // 检查是否已存在关联记录
        const [existing] = await connection.query(`
          SELECT id FROM member_groups 
          WHERE member_id = ? AND group_id = ?
        `, [owner.member_id, owner.group_id]);
        
        if (existing.length > 0) {
          // 更新为群主
          await connection.query(`
            UPDATE member_groups 
            SET is_owner = 1
            WHERE member_id = ? AND group_id = ?
          `, [owner.member_id, owner.group_id]);
        } else {
          // 创建新的关联记录
          await connection.query(`
            INSERT INTO member_groups 
            (member_id, group_id, is_owner)
            VALUES (?, ?, 1)
          `, [owner.member_id, owner.group_id]);
        }
        
        updatedCount++;
      }
      
      logger.info(`成功更新 ${updatedCount} 条群主状态记录`);
    } else {
      logger.info('没有需要同步的群主状态记录');
    }
    
    // 2. 确保member_groups表中的is_owner=1记录与groups表中的owner_id一致
    const [groupsWithOwner] = await connection.query(`
      SELECT DISTINCT mg.group_id, mg.member_id
      FROM member_groups mg
      JOIN \`groups\` g ON mg.group_id = g.id
      WHERE mg.is_owner = 1
      AND g.owner_id != mg.member_id
    `);
    
    logger.info(`找到 ${groupsWithOwner.length} 个群组需要更新owner_id`);
    
    let groupsUpdated = 0;
    for (const group of groupsWithOwner) {
      await connection.query(`
        UPDATE \`groups\`
        SET owner_id = ?
        WHERE id = ?
      `, [group.member_id, group.group_id]);
      
      groupsUpdated++;
    }
    
    logger.info(`成功更新 ${groupsUpdated} 个群组的owner_id`);
    
    return {
      success: true,
      syncedMembersCount: updatedCount,
      syncedGroupsCount: groupsUpdated
    };
  } catch (error) {
    logger.error(`同步群主状态失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

/**
 * 更新群组成员数量
 * 根据member_groups表中的实际成员数更新groups表中的member_count
 */
async function updateGroupMemberCounts() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始更新群组成员数量...');
    
    // 更新所有群组的成员数量
    const [result] = await connection.query(`
      UPDATE \`groups\` g
      SET member_count = (
        SELECT COUNT(*) 
        FROM member_groups mg 
        WHERE mg.group_id = g.id
      )
    `);
    
    logger.info(`已更新 ${result.affectedRows} 个群组的成员数量`);
    
    return {
      success: true,
      updatedCount: result.affectedRows
    };
  } catch (error) {
    logger.error(`更新群组成员数量失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

/**
 * 同步会员群组关系数据
 * 可以通过定时任务调用此函数
 */
async function syncMemberGroups() {
  try {
    // 先同步关系数据
    const result = await checkUnsyncedMembersGroups();
    
    // 再同步群主状态
    const ownerResult = await syncGroupOwnerStatus();
    
    // 更新群组成员数量
    const countResult = await updateGroupMemberCounts();
    
    return {
      success: result.success && ownerResult.success && countResult.success,
      syncedCount: result.syncedCount,
      syncedOwnersCount: ownerResult.syncedMembersCount,
      syncedGroupsCount: ownerResult.syncedGroupsCount,
      updatedCountsCount: countResult.updatedCount
    };
  } catch (error) {
    logger.error(`同步会员群组关系失败: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// 如果直接运行此脚本，则执行同步
if (require.main === module) {
  syncMemberGroups()
    .then(result => {
      if (result.success) {
        logger.info(`会员群组关系同步完成，同步了 ${result.syncedCount} 条记录, ${result.syncedOwnersCount} 个群主状态, ${result.syncedGroupsCount} 个群组owner_id`);
      } else {
        logger.error(`会员群组关系同步失败: ${result.error}`);
      }
      process.exit(0);
    })
    .catch(error => {
      logger.error(`会员群组关系同步过程中发生错误: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  syncMemberGroups,
  checkUnsyncedMembersGroups,
  syncGroupOwnerStatus,
  updateGroupMemberCounts
}; 