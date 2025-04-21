/**
 * 加密工具函数
 * 用于敏感数据的加密和解密
 */
const crypto = require('crypto');
const logger = require('../config/logger.config');

/**
 * 加密数据
 * @param {string} plaintext - 需要加密的明文
 * @returns {string} 加密后的字符串（格式：iv:authTag:encrypted）
 */
function encrypt(plaintext) {
  try {
    // 获取主密钥（应存储在环境变量中）
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      logger.error('加密主密钥未配置，请检查.env.admin文件');
      throw new Error('加密主密钥未配置');
    }

    // 记录日志但不输出完整密钥（仅显示前6位作为参考）
    logger.debug(`使用加密主密钥: ${masterKey.substring(0, 6)}******`);

    // 使用AES-256-GCM算法（提供认证加密）
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
  } catch (error) {
    logger.error(`加密数据失败: ${error.message}`);
    throw new Error('加密操作失败');
  }
}

/**
 * 解密数据
 * @param {string} ciphertext - 加密的字符串（格式：iv:authTag:encrypted）
 * @returns {string} 解密后的明文
 */
function decrypt(ciphertext) {
  try {
    // 获取主密钥（应存储在环境变量中）
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) {
      logger.error('加密主密钥未配置，请检查.env.admin文件');
      throw new Error('加密主密钥未配置');
    }

    // 记录日志但不输出完整密钥（仅显示前6位作为参考）
    logger.debug(`使用加密主密钥: ${masterKey.substring(0, 6)}******`);

    // 解析加密文本
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('加密文本格式不正确');
    }
    
    // 使用AES-256-GCM算法
    const algorithm = 'aes-256-gcm';
    // 创建解密器
    const decipher = crypto.createDecipheriv(
      algorithm, 
      Buffer.from(masterKey, 'hex'),
      Buffer.from(ivHex, 'hex')
    );
    
    // 设置认证标签
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    // 解密数据
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error(`解密数据失败: ${error.message}`);
    throw new Error('解密操作失败');
  }
}

/**
 * 判断字符串是否为加密格式
 * @param {string} text - 需要判断的字符串
 * @returns {boolean} 是否为加密格式
 */
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

module.exports = {
  encrypt,
  decrypt,
  isEncrypted
}; 