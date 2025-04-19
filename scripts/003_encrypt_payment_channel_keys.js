/*
 * @Author: diaochan
 * @Date: 2025-04-20 16:15:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-19 15:45:29
 * @Description: 加密支付渠道表中的密钥
 */
/**
 * 迁移脚本：加密支付渠道表中的密钥
 * 目的：增强系统安全性，保护支付渠道敏感信息
 */
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 从.env.admin文件加载环境变量
const dotenv = require('dotenv');
const envPath = path.resolve(process.cwd(), '.env.admin');
if (fs.existsSync(envPath)) {
  console.log(`正在从 ${envPath} 加载环境变量...`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`.env.admin 文件不存在，尝试加载默认 .env 文件`);
  dotenv.config();
}

// 加密函数 - 与 src/shared/utils/encryption.util.js 保持一致
function encrypt(plaintext) {
  // 获取主密钥
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error('加密主密钥未配置，请在.env.admin文件中设置ENCRYPTION_MASTER_KEY');
  }

  // 使用AES-256-GCM算法
  const algorithm = 'aes-256-gcm';
  // 创建随机初始化向量
  const iv = crypto.randomBytes(16);
  // 创建加密器
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(masterKey, 'hex'), iv);
  
  // 加密数据
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // 获取认证标签
  const authTag = cipher.getAuthTag().toString('hex');
  
  // 返回格式: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

// 判断字符串是否为加密格式
function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  
  // 检查是否符合加密文本格式 (iv:authTag:encrypted)
  const parts = text.split(':');
  if (parts.length !== 3) return false;
  
  // 检查每部分是否都是有效的十六进制字符串
  return /^[0-9a-f]+$/i.test(parts[0]) && 
         /^[0-9a-f]+$/i.test(parts[1]) && 
         /^[0-9a-f]+$/i.test(parts[2]);
}

// 执行迁移
async function migratePaymentChannelKeys() {
  console.log('开始执行迁移：加密支付渠道表中的密钥');

  // 检查是否配置了加密主密钥
  if (!process.env.ENCRYPTION_MASTER_KEY) {
    console.error('错误：加密主密钥(ENCRYPTION_MASTER_KEY)未配置');
    console.error('请在.env.admin文件中添加32字节(64个十六进制字符)的随机密钥');
    process.exit(1);
  }

  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('成功连接到数据库');
    
    // 获取所有支付渠道记录
    const [channels] = await connection.query(`
      SELECT id, secret_key FROM payment_channels
    `);

    console.log(`找到 ${channels.length} 条支付渠道记录`);
    
    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let emptyKeyCount = 0;

    // 开始事务
    await connection.beginTransaction();

    // 遍历并加密密钥
    for (const channel of channels) {
      if (!channel.secret_key) {
        emptyKeyCount++;
        continue;
      }

      // 检查密钥是否已经加密
      if (isEncrypted(channel.secret_key)) {
        alreadyEncryptedCount++;
        continue;
      }

      // 加密密钥
      const encryptedKey = encrypt(channel.secret_key);
      
      // 更新记录
      await connection.query(`
        UPDATE payment_channels 
        SET secret_key = ? 
        WHERE id = ?
      `, [encryptedKey, channel.id]);
      
      encryptedCount++;
    }

    // 提交事务
    await connection.commit();

    console.log(`迁移完成:`);
    console.log(`- ${encryptedCount} 条记录的密钥已加密`);
    console.log(`- ${alreadyEncryptedCount} 条记录的密钥已经是加密格式`);
    console.log(`- ${emptyKeyCount} 条记录没有密钥值`);

  } catch (error) {
    // 回滚事务
    await connection.rollback();
    console.error(`迁移失败: ${error.message}`);
    process.exit(1);
  } finally {
    // 关闭连接
    await connection.end();
  }
}

// 执行迁移
migratePaymentChannelKeys().catch(err => {
  console.error('迁移过程中出错：', err.message);
  process.exit(1);
}); 