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
    
    const baseUrl = process.env.IMAGE_BASE_URL;
    
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