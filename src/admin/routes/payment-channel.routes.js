/**
 * 支付渠道管理路由
 */
const express = require('express');
const paymentChannelController = require('../controllers/payment-channel.controller');
const validatorUtil = require('../../shared/utils/validator.util');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimiterMiddleware = require('../../shared/middlewares/rateLimiter.middleware');
const { body, param } = require('express-validator');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware.verifyToken);
router.use(rateLimiterMiddleware.apiLimiter);
// 所有路由都需要支付渠道管理权限
router.use(authMiddleware.hasPermission('finance:paymentChannels'));

/**
 * @route GET /api/admin/payment-channels
 * @desc 获取支付渠道列表
 * @access Private - Finance:PaymentChannels
 */
router.get(
  '/',
  paymentChannelController.getPaymentChannels
);

/**
 * @route POST /api/admin/payment-channels
 * @desc 添加支付渠道
 * @access Private - Finance:PaymentChannels
 */
router.post(
  '/',
  [
    body('name')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('bank')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('merchantId')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('secretKey')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 255 })
      .withMessage('common.validation.maxLength{max:255}')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  paymentChannelController.addPaymentChannel
);

/**
 * @route PUT /api/admin/payment-channels/:id
 * @desc 更新支付渠道
 * @access Private - Finance:PaymentChannels
 */
router.put(
  '/:id',
  [
    param('id')
      .isInt()
      .withMessage('common.validation.mustBeInt'),
    body('name')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('bank')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('merchantId')
      .notEmpty()
      .withMessage('common.validation.mustNotBeEmpty')
      .isLength({ max: 100 })
      .withMessage('common.validation.maxLength{max:100}'),
    body('secretKey')
      .optional()
      .isLength({ max: 255 })
      .withMessage('common.validation.maxLength{max:255}')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  paymentChannelController.updatePaymentChannel
);

/**
 * @route DELETE /api/admin/payment-channels/:id
 * @desc 删除支付渠道
 * @access Private - Finance:PaymentChannels
 */
router.delete(
  '/:id',
  [
    param('id')
      .isInt()
      .withMessage('common.validation.mustBeInt')
  ],
  (req, res, next) => validatorUtil.validateRequest(req, res) ? next() : null,
  paymentChannelController.deletePaymentChannel
);

module.exports = router; 