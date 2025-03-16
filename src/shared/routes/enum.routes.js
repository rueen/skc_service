/**
 * 枚举路由
 * 处理枚举常量相关的路由
 */
const express = require('express');
const enumController = require('../controllers/enum.controller');

const router = express.Router();

/**
 * @route GET /api/enums/:enumType
 * @desc 获取指定类型的枚举常量
 * @access Public
 */
router.get('/:enumType', enumController.getEnum);

/**
 * @route GET /api/enums
 * @desc 获取所有枚举常量
 * @access Public
 */
router.get('/', enumController.getAllEnums);

module.exports = router; 