/*
 * @Author: diaochan
 * @Date: 2025-03-15 16:12:24
 * @LastEditors: diaochan
 * @LastEditTime: 2025-03-15 16:52:29
 * @Description: 
 */
/**
 * 上传控制器
 * 处理文件上传相关的请求
 */
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');

// 获取服务器信息
const SERVER_HOST = 'http://localhost';
const PORT = process.env.ADMIN_PORT || 3002;
const BASE_PATH = process.env.BASE_URL || '/api/support';

/**
 * 上传图片
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return responseUtil.badRequest(res, '请选择要上传的图片');
    }

    // 构建完整的图片访问路径
    // 如果BASE_PATH是完整URL，则直接使用；否则构建完整URL
    const baseUrl = BASE_PATH.startsWith('http') 
      ? BASE_PATH 
      : `${SERVER_HOST}:${PORT}`;
    
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    return responseUtil.success(res, { url: imageUrl });

  } catch (error) {
    logger.error(`上传图片失败: ${error.message}`);
    return responseUtil.serverError(res, '上传图片失败');
  }
}

module.exports = {
  uploadImage
}; 