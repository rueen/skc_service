/**
 * 会员群组关系同步脚本
 * 用于定期检查和同步会员群组关系数据
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 检查会员表中是否有没有同步到关联表的数据
 */
async function checkUnsyncedMembersGroups() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始检查未同步的会员群组关系...');
    
    // 查找在会员表中设置了group_id但在关联表中不存在的记录
    const [unsynced] = await connection.query(`
      SELECT m.id, m.member_nickname, m.group_id, m.is_group_owner
      FROM members m
      LEFT JOIN member_groups mg ON m.id = mg.member_id
      WHERE m.group_id IS NOT NULL 
      AND mg.id IS NULL
    `);
    
    logger.info(`找到 ${unsynced.length} 条未同步的会员群组关系`);
    
    if (unsynced.length > 0) {
      // 准备批量插入的数据
      const values = unsynced.map(m => [
        m.id,              // member_id
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
    
    // 1. 同步 members 表的 is_group_owner 到 member_groups 表的 is_owner
    const [membersToSync] = await connection.query(`
      SELECT m.id, m.group_id, m.is_group_owner
      FROM members m
      JOIN member_groups mg ON m.id = mg.member_id AND m.group_id = mg.group_id
      WHERE m.is_group_owner != mg.is_owner
    `);
    
    logger.info(`找到 ${membersToSync.length} 条需要同步群主状态的记录`);
    
    let updatedCount = 0;
    if (membersToSync.length > 0) {
      for (const member of membersToSync) {
        await connection.query(`
          UPDATE member_groups 
          SET is_owner = ?
          WHERE member_id = ? AND group_id = ?
        `, [member.is_group_owner, member.id, member.group_id]);
        
        updatedCount++;
      }
      
      logger.info(`成功更新 ${updatedCount} 条群主状态记录`);
    } else {
      logger.info('没有需要同步的群主状态记录');
    }
    
    // 2. 更新groups表中的owner_id，确保与member_groups表一致
    const [groupsWithOwner] = await connection.query(`
      SELECT DISTINCT group_id, member_id
      FROM member_groups
      WHERE is_owner = 1
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
 * 同步会员群组关系数据
 * 可以通过定时任务调用此函数
 */
async function syncMemberGroups() {
  try {
    // 先同步关系数据
    const result = await checkUnsyncedMembersGroups();
    
    // 再同步群主状态
    const ownerResult = await syncGroupOwnerStatus();
    
    return {
      success: result.success && ownerResult.success,
      syncedCount: result.syncedCount,
      syncedOwnersCount: ownerResult.syncedMembersCount,
      syncedGroupsCount: ownerResult.syncedGroupsCount
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
  syncGroupOwnerStatus
}; 