/**
 * 账单控制器
 * 处理账单相关的业务逻辑
 */
const billModel = require('../../shared/models/bill.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');

/**
 * 获取账单列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function list(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      memberNickname, 
      billType, 
      settlementStatus 
    } = req.query;
    
    const filters = {};
    
    if (memberNickname) filters.memberNickname = memberNickname;
    if (billType) filters.billType = billType;
    if (settlementStatus) filters.settlementStatus = settlementStatus;

    // 获取账单列表
    const result = await billModel.getAllBills(filters, page, pageSize);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取账单列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取账单列表失败');
  }
}

module.exports = {
  list
}; 