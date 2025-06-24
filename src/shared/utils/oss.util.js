/**
 * 阿里云OSS工具类
 * 处理文件上传至OSS的相关逻辑
 */
const OSS = require('ali-oss');
const fs = require('fs');
const { logger } = require('../config/logger.config');

// 创建OSS客户端实例（延迟初始化）
let client = null;

/**
 * 获取OSS客户端实例
 * @returns {Object} OSS客户端实例
 */
function getClient() {
  if (!client) {
    // 检查环境变量是否设置
    if (!process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET || !process.env.OSS_REGION || !process.env.OSS_BUCKET) {
      logger.error('OSS环境变量未设置，请检查.env文件');
      throw new Error('OSS环境变量未设置，请检查.env文件');
    }
    
    // 首次调用时创建客户端
    client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET
    });
    
    logger.info(`OSS客户端已初始化，Bucket: ${process.env.OSS_BUCKET}, Region: ${process.env.OSS_REGION}`);
  }
  
  return client;
}

/**
 * 上传文件到OSS
 * @param {Object} file - Multer上传的文件对象
 * @param {string} directory - OSS中的目录(可选)
 * @returns {Promise<string>} 上传后的OSS URL
 */
async function uploadFile(file, directory = process.env.OSS_DIR) {
  try {
    // 获取OSS客户端
    const ossClient = getClient();
    
    // 构建OSS中的文件路径
    const ossPath = directory ? `${directory}/${file.filename}` : file.filename;
    
    // 读取文件
    const fileContent = fs.readFileSync(file.path);
    
    // 上传到OSS
    const result = await ossClient.put(ossPath, fileContent, {
      headers: {
        // 根据文件MIME类型设置Content-Type
        'Content-Type': file.mimetype
      }
    });
    
    // 删除本地临时文件
    fs.unlinkSync(file.path);
    
    // 返回OSS URL
    return result.url;
  } catch (error) {
    logger.error(`上传文件到OSS失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除OSS中的文件
 * @param {string} url - 文件URL或OSS路径
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteFile(url) {
  try {
    // 获取OSS客户端
    const ossClient = getClient();
    
    // 如果传入的是完整URL，提取OSS路径
    let ossPath = url;
    if (url.startsWith('http')) {
      // 提取URL中的路径部分
      const urlObj = new URL(url);
      ossPath = urlObj.pathname.startsWith('/') 
        ? urlObj.pathname.substring(1) // 去掉开头的斜杠
        : urlObj.pathname;
    }
    
    // 删除OSS文件
    await ossClient.delete(ossPath);
    return true;
  } catch (error) {
    logger.error(`删除OSS文件失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  getClient,
  uploadFile,
  deleteFile
}; 