/**
 * 修复渠道表中的custom_fields字段
 * 针对JSON解析错误的情况进行修复
 */
const { pool } = require('../src/shared/models/db');
const logger = require('../src/shared/config/logger.config');

async function fixChannelCustomFields() {
  const connection = await pool.getConnection();
  
  try {
    logger.info('开始修复渠道自定义字段...');
    
    // 查询所有渠道
    const [channels] = await connection.query('SELECT id, name, custom_fields FROM channels');
    logger.info(`获取到 ${channels.length} 个渠道记录`);
    
    let fixedCount = 0;
    
    for (const channel of channels) {
      if (channel.custom_fields === null) {
        // 如果为null，不需要修复
        continue;
      }
      
      try {
        // 尝试解析，如果成功，说明JSON格式正确
        if (typeof channel.custom_fields === 'string') {
          JSON.parse(channel.custom_fields);
        }
        // 如果已经是对象，也不需要修复
      } catch (error) {
        logger.warn(`渠道 [${channel.id}] ${channel.name} 的custom_fields字段格式有误: ${error.message}`);
        
        // 修复策略：将错误的JSON设为null
        await connection.query(
          'UPDATE channels SET custom_fields = NULL WHERE id = ?',
          [channel.id]
        );
        
        logger.info(`已修复渠道 [${channel.id}] ${channel.name} 的custom_fields字段`);
        fixedCount++;
      }
    }
    
    logger.info(`完成修复，共修复了 ${fixedCount} 个渠道记录`);
  } catch (error) {
    logger.error(`修复渠道自定义字段失败: ${error.message}`);
    process.exit(1);
  } finally {
    connection.release();
  }
}

// 执行修复
fixChannelCustomFields().then(() => {
  logger.info('修复脚本执行完毕');
  process.exit(0);
}); 