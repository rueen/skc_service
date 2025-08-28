/**
 * 地区路由
 * 处理地区相关的路由
 */
const express = require('express');
const regionController = require('../controllers/region.controller');

const router = express.Router();

/**
 * @route GET /default-region
 * @desc 获取默认地区
 * @access Public
 */
router.get('/default-region', regionController.getDefaultRegion);

module.exports = router;
