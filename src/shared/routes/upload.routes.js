/**
 * 共享上传路由
 * 处理文件上传相关的路由
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_CONFIG } = require('../config/api.config');
const uploadController = require('../controllers/upload.controller');
const rateLimiterMiddleware = require('../middlewares/rateLimiter.middleware');
const responseUtil = require('../utils/response.util');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    // 首先从原始文件名中获取扩展名
    let ext = path.extname(file.originalname).toLowerCase();
    
    // 如果没有扩展名或扩展名不匹配文件类型，则根据mimetype设置正确的扩展名
    if (!ext || ext === '') {
      switch (file.mimetype) {
        case 'image/jpeg':
          ext = '.jpg';
          break;
        case 'image/png':
          ext = '.png';
          break;
        case 'image/gif':
          ext = '.gif';
          break;
        case 'image/webp':
          ext = '.webp';
          break;
        case 'image/svg+xml':
          ext = '.svg';
          break;
        default:
          // 默认使用.jpg，虽然这种情况不应该出现
          // 因为我们已经在fileFilter中过滤了不支持的类型
          ext = '.jpg';
      }
    }
    
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

// 中间件：设置应用类型
const setAppType = (appType) => (req, res, next) => {
  req.appType = appType;
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

// 导出路由和中间件
module.exports = {
  router,
  setAppType
}; 