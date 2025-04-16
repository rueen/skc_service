/**
 * Admin端提现控制器
 * 处理提现相关的请求
 */
const withdrawalModel = require('../../shared/models/withdrawal.model');
const responseUtil = require('../../shared/utils/response.util');
const logger = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const memberModel = require('../../shared/models/member.model');
const withdrawalAccountModel = require('../../shared/models/withdrawal-account.model');
const { WithdrawalStatus } = require('../../shared/config/enums');
const paymentTransactionModel = require('../../shared/models/payment-transaction.model');

/**
 * 获取提现记录列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getWithdrawals(req, res) {
  try {
    const { 
      page = DEFAULT_PAGE, 
      pageSize = DEFAULT_PAGE_SIZE, 
      withdrawalStatus, 
      memberId, 
      startTime, 
      endTime,
      billNo
    } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10
    };
    
    if (withdrawalStatus) {
      options.withdrawalStatus = withdrawalStatus;
    }
    
    if (memberId) {
      options.memberId = memberId;
    }
    
    if (startTime) {
      options.startTime = startTime;
    }
    
    if (endTime) {
      options.endTime = endTime;
    }
    
    if (billNo) {
      options.billNo = billNo;
    }
    
    const withdrawals = await withdrawalModel.getAllWithdrawals(options);
    
    return responseUtil.success(res, withdrawals);
  } catch (error) {
    logger.error(`获取提现记录列表失败: ${error.message}`);
    return responseUtil.serverError(res, '获取提现记录列表失败');
  }
}

/**
 * 批量审核通过提现申请
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchResolveWithdrawals(req, res) {
  try {
    const { ids, remark } = req.body;
    const waiterId = req.user.id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '提现ID列表不能为空');
    }
    
    const result = await withdrawalModel.batchApproveWithdrawals(ids, waiterId, remark);
    
    if (!result) {
      return responseUtil.badRequest(res, '批量审核失败，可能没有符合条件的提现申请');
    }
    
    return responseUtil.success(res, { message: '批量审核通过成功' });
  } catch (error) {
    logger.error(`批量审核通过提现申请失败: ${error.message}`);
    return responseUtil.serverError(res, '批量审核通过提现申请失败');
  }
}

/**
 * 批量拒绝提现申请
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function batchRejectWithdrawals(req, res) {
  try {
    const { ids, rejectReason, remark } = req.body;
    const waiterId = req.user.id;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return responseUtil.badRequest(res, '提现ID列表不能为空');
    }
    
    if (!rejectReason) {
      return responseUtil.badRequest(res, '拒绝原因不能为空');
    }
    
    const result = await withdrawalModel.batchRejectWithdrawals(ids, rejectReason, waiterId, remark);
    
    if (!result) {
      return responseUtil.badRequest(res, '批量拒绝失败，可能没有符合条件的提现申请');
    }
    
    return responseUtil.success(res, { message: '批量拒绝提现申请成功' });
  } catch (error) {
    logger.error(`批量拒绝提现申请失败: ${error.message}`);
    return responseUtil.serverError(res, '批量拒绝提现申请失败');
  }
}

/**
 * 导出提现数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportWithdrawals(req, res) {
  try {
    const { memberNickname, withdrawalStatus, billNo, startDate, endDate } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (memberNickname) filters.memberNickname = memberNickname;
    if (withdrawalStatus) filters.withdrawalStatus = withdrawalStatus;
    if (billNo) filters.billNo = billNo;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    // 导出提现列表
    const withdrawals = await withdrawalModel.exportWithdrawals(filters);
    
    if (!withdrawals || withdrawals.length === 0) {
      return res.status(404).send('没有符合条件的提现数据');
    }
    
    // 设置响应头，指定为 CSV 文件下载
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=withdrawals.csv');
    
    // CSV 表头
    const headers = [
      'ID', '会员ID', '会员昵称', '金额', '提现状态', '账单编号', 
      '支付渠道ID', '提现账户', '提现账户姓名', '拒绝原因', '审核员ID', 
      '处理时间', '备注', '创建时间', '更新时间'
    ];
    
    // 写入表头
    res.write('\ufeff' + headers.join(',') + '\n');
    
    // 写入数据行
    withdrawals.forEach(item => {
      const values = [
        item.id || '',
        item.memberId || '',
        (item.memberNickname || '').replace(/,/g, '，'), // 替换逗号防止影响 CSV 格式
        item.amount || '',
        (item.withdrawalStatus || '').replace(/,/g, '，'),
        (item.billNo || '').replace(/,/g, '，'),
        item.paymentChannelId || '',
        (item.withdrawalAccount || '').replace(/,/g, '，'),
        (item.withdrawalName || '').replace(/,/g, '，'),
        (item.rejectReason || '').replace(/,/g, '，'),
        item.waiterId || '',
        (item.processTime || '').replace(/,/g, '，'),
        (item.remark || '').replace(/,/g, '，'),
        (item.createTime || '').replace(/,/g, '，'),
        (item.updateTime || '').replace(/,/g, '，')
      ];
      
      res.write(values.join(',') + '\n');
    });
    
    return res.end();
  } catch (error) {
    logger.error(`导出提现数据失败: ${error.message}`);
    return responseUtil.serverError(res, '导出提现数据失败，请稍后重试');
  }
}

/**
 * 获取所有支付交易记录
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getAllTransactions(req, res) {
  try {
    const page = parseInt(req.query.page) || DEFAULT_PAGE;
    const pageSize = parseInt(req.query.pageSize) || DEFAULT_PAGE_SIZE;
    
    // 构建筛选条件
    const filters = {};
    
    if (req.query.memberId) {
      filters.memberId = parseInt(req.query.memberId);
    }
    
    if (req.query.transactionStatus) {
      filters.transactionStatus = req.query.transactionStatus;
    }
    
    if (req.query.orderId) {
      filters.orderId = req.query.orderId;
    }
    
    if (req.query.withdrawalId) {
      filters.withdrawalId = parseInt(req.query.withdrawalId);
    }
    
    if (req.query.startDate) {
      filters.startDate = req.query.startDate;
    }
    
    if (req.query.endDate) {
      filters.endDate = req.query.endDate;
    }
    
    // 获取交易记录
    const transactions = await paymentTransactionModel.getTransactions(filters, page, pageSize);
    
    return responseUtil.success(res, transactions);
  } catch (error) {
    return responseUtil.serverError(res, error.message);
  }
}

module.exports = {
  getWithdrawals,
  batchResolveWithdrawals,
  batchRejectWithdrawals,
  exportWithdrawals,
  getAllTransactions
}; 