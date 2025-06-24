/**
 * Admin端提现控制器
 * 处理提现相关的请求
 */
const withdrawalModel = require('../../shared/models/withdrawal.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const { WithdrawalStatus } = require('../../shared/config/enums');
const paymentTransactionModel = require('../../shared/models/payment-transaction.model');
const i18n = require('../../shared/utils/i18n.util');

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
      billNo,
      memberNickname
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
    
    if (memberNickname) {
      options.memberNickname = memberNickname;
    }
    
    const withdrawals = await withdrawalModel.getAllWithdrawals(options);
    
    return responseUtil.success(res, withdrawals);
  } catch (error) {
    logger.error(`获取提现记录列表失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.badRequest(res, i18n.t('admin.withdrawal.noWithdrawalsResolve', req.lang));
    }
    
    return responseUtil.success(res);
  } catch (error) {
    logger.error(`批量审核通过提现申请失败: ${error.message}`);
    return responseUtil.serverError(res);
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
      return responseUtil.badRequest(res, i18n.t('admin.withdrawal.noWithdrawalsReject', req.lang));
    }
    
    return responseUtil.success(res);
  } catch (error) {
    logger.error(`批量拒绝提现申请失败: ${error.message}`);
    return responseUtil.serverError(res);
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
    const options = {
      exportMode: true, // 使用导出模式，不分页
      memberNickname,
      withdrawalStatus,
      billNo
    };
    
    if (startDate) options.startTime = `${startDate} 00:00:00`;
    if (endDate) options.endTime = `${endDate} 23:59:59`;
    
    // 获取提现列表数据
    const result = await withdrawalModel.getAllWithdrawals(options);
    const withdrawals = result.list;
    
    if (!withdrawals || withdrawals.length === 0) {
      return res.status(404).send('没有符合条件的提现数据');
    }
    
    // 创建Excel工作簿和工作表
    const Excel = require('exceljs');
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('提现列表');
    
    // 设置列定义和宽度
    worksheet.columns = [
      { header: '账单编号', key: 'billNo', width: 25 },
      { header: '会员ID', key: 'nickname', width: 15 },
      { header: '会员账号', key: 'memberAccount', width: 20 },
      { header: '提现账户', key: 'account', width: 25 },
      { header: '账户类型', key: 'paymentChannelName', width: 15 },
      { header: '提现金额', key: 'amount', width: 12 },
      { header: '姓名', key: 'withdrawalName', width: 15 },
      { header: '申请时间', key: 'createTime', width: 20 },
      { header: '提现状态', key: 'withdrawalStatus', width: 12 },
      { header: '提现备注', key: 'rejectReason', width: 30 },
      { header: '操作员', key: 'waiterName', width: 15 }
    ];
    
    // 添加数据行
    withdrawals.forEach(item => {
      worksheet.addRow({
        billNo: item.billNo || '',
        nickname: item.nickname || '',
        memberAccount: item.memberAccount || '',
        account: item.account || '',
        paymentChannelName: item.paymentChannelName || '',
        amount: item.amount || 0,
        withdrawalName: item.withdrawalName || '',
        createTime: item.createTime || '',
        withdrawalStatus: getStatusText(item.withdrawalStatus) || '',
        rejectReason: item.rejectReason || item.remark || '',
        waiterName: item.waiterName || ''
      });
    });
    
    // 设置表格首行样式
    worksheet.getRow(1).height = 25; // 表头行高
    worksheet.getRow(1).font = { bold: true }; // 加粗表头
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }; // 居中对齐
    
    // 设置金额列的格式
    const amountColumn = worksheet.getColumn('amount');
    amountColumn.numFmt = '0.00';
    
    // 设置整个表格的样式
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 1) { // 跳过表头行
        row.eachCell({ includeEmpty: false }, cell => {
          cell.alignment = { vertical: 'middle' };
        });
      }
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=withdrawals.xlsx');
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`导出提现数据失败: ${error.message}`);
    return responseUtil.serverError(res, '导出提现数据失败，请稍后重试');
  }
}

/**
 * 获取提现状态对应的中文描述
 * @param {string} status - 状态代码
 * @returns {string} - 状态中文描述
 */
function getStatusText(status) {
  const statusMap = {
    'pending': '待审核',
    'processing': '处理中',
    'success': '成功',
    'failed': '失败'
  };
  
  return statusMap[status] || status;
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