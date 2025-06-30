/**
 * 账单控制器
 * 处理账单相关的业务逻辑
 */
const billModel = require('../../shared/models/bill.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
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
      keyword,
      memberNickname, 
      billType, 
      settlementStatus,
      billNo,
      taskName,
      startTime,
      endTime,
      relatedGroupId
    } = req.query;
    
    const filters = {};
    
    if (keyword) filters.keyword = keyword;
    if (memberNickname) filters.memberNickname = memberNickname;
    if (billType) filters.billType = billType;
    if (settlementStatus) filters.settlementStatus = settlementStatus;
    if (billNo) filters.billNo = billNo;
    if (taskName) filters.taskName = taskName;
    if (startTime) filters.startTime = startTime;
    if (endTime) filters.endTime = endTime;
    if (relatedGroupId) filters.relatedGroupId = parseInt(relatedGroupId, 10);

    // 获取账单列表
    const result = await billModel.getAllBills(filters, page, pageSize);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取账单列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  list
}; 