/**
 * 共享上传控制器
 * 处理文件上传相关的请求
 */
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');

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

    // 获取服务器信息
    const appType = req.appType || 'admin'; // 默认为admin
    const SERVER_HOST = process.env.SERVER_HOST || 'http://localhost';
    const PORT = appType === 'admin' 
      ? (process.env.ADMIN_PORT || 3002)
      : (process.env.H5_PORT || 3001);
    const BASE_PATH = appType === 'admin'
      ? (process.env.ADMIN_BASE_URL || '/api/support')
      : (process.env.H5_BASE_URL || '/api/h5');
    
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