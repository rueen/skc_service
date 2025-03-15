/**
 * 上传路由
 * 处理文件上传相关的路由
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const { UPLOAD_CONFIG } = require('../../shared/config/api.config');
const uploadController = require('../controllers/upload.controller');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const responseUtil = require('../../shared/utils/response.util');

const router = express.Router();

// 配置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // 确保上传目录存在
    if (!require('fs').existsSync(uploadDir)) {
      require('fs').mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_SIZE
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'));
    }
  }
});

// 错误处理中间件
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return responseUtil.badRequest(res, '图片大小不能超过1MB');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return responseUtil.badRequest(res, '请使用正确的字段名上传文件：file');
    }
    return responseUtil.badRequest(res, '文件上传失败');
  }
  if (err) {
    return responseUtil.serverError(res, err.message);
  }
  next();
};

/**
 * @route POST /api/upload/image
 * @desc 上传图片
 * @access Public
 */
router.post(
  '/image',
  rateLimiterMiddleware.apiLimiter,
  upload.single('file'),
  handleMulterError,
  uploadController.uploadImage
);

module.exports = router; 