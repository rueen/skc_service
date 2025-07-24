/**
 * 共享上传控制器
 * 处理文件上传相关的请求
 */
const responseUtil = require('../utils/response.util');
const { logger } = require('../config/logger.config');
const ossUtil = require('../utils/oss.util');

/**
 * 上传图片
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @body {string} [directory] - OSS自定义目录
 */
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return responseUtil.badRequest(res, '请选择要上传的图片');
    }
    // 获取自定义目录参数
    const directory = req.body.directory;
    // 使用OSS上传文件，支持自定义目录
    const ossUrl = await ossUtil.uploadFile(req.file, directory);
    return responseUtil.success(res, { url: ossUrl });
  } catch (error) {
    logger.error(`上传图片失败: ${error.message}`);
    return responseUtil.serverError(res, '上传图片失败');
  }
}

module.exports = {
  uploadImage
}; 