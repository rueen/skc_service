/**
 * 数据迁移脚本
 * 用于将现有会员的群组信息迁移到新的member_groups关联表
 */
const { pool } = require('./db');
const logger = require('../config/logger.config');

/**
 * 迁移会员群组关系数据
 */
async function migrateMemberGroups() {
  const connection = await pool.getConnection();
  try {
    logger.info('开始迁移会员群组关系数据...');
    
    // 开始事务
    await connection.beginTransaction();
    
    // 1. 查询所有有群组关联的会员
    const [members] = await connection.query(`
      SELECT id, group_id, is_group_owner 
      FROM members 
      WHERE group_id IS NOT NULL
    `);
    
    logger.info(`找到 ${members.length} 条需要迁移的会员群组关系数据`);
    
    // 2. 将数据插入到 member_groups 表
    if (members.length > 0) {
      // 获取已存在的关联记录
      const [existingRecords] = await connection.query(`
        SELECT member_id FROM member_groups
      `);
      
      const existingMemberIds = existingRecords.map(record => record.member_id);
      
      // 过滤掉已经存在关联记录的会员
      const membersToMigrate = members.filter(m => !existingMemberIds.includes(m.id));
      
      if (membersToMigrate.length > 0) {
        // 准备批量插入的数据
        const values = membersToMigrate.map(m => [
          m.id,
          m.group_id,
          m.is_group_owner
        ]);
        
        // 执行批量插入
        await connection.query(`
          INSERT INTO member_groups 
          (member_id, group_id, is_owner)
          VALUES ?
        `, [values]);
        
        logger.info(`成功迁移 ${values.length} 条会员群组关系数据`);
      } else {
        logger.info('没有新的会员群组关系需要迁移');
      }
    }
    
    // 3. 更新群组的成员数量
    await connection.query(`
      UPDATE \`groups\` g
      SET member_count = (
        SELECT COUNT(*) 
        FROM member_groups mg 
        WHERE mg.group_id = g.id
      )
    `);
    
    logger.info('群组成员数量已更新');
    
    // 提交事务
    await connection.commit();
    logger.info('会员群组关系数据迁移完成');
    
    return { success: true, message: '会员群组关系数据迁移成功' };
  } catch (error) {
    // 回滚事务
    await connection.rollback();
    logger.error(`会员群组关系数据迁移失败: ${error.message}`);
    return { success: false, message: `会员群组关系数据迁移失败: ${error.message}` };
  } finally {
    connection.release();
  }
}

// 导出迁移函数
module.exports = {
  migrateMemberGroups
}; 