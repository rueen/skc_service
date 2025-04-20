/**
 * 共享上传控制器
 * 处理文件上传相关的请求
 */
const responseUtil = require('../utils/response.util');
const logger = require('../config/logger.config');
const ossUtil = require('../utils/oss.util');

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
    
    // 使用OSS上传文件
    const ossUrl = await ossUtil.uploadFile(req.file);
    
    return responseUtil.success(res, { url: ossUrl });
  } catch (error) {
    logger.error(`上传图片失败: ${error.message}`);
    return responseUtil.serverError(res, '上传图片失败');
  }
}

module.exports = {
  uploadImage
}; 