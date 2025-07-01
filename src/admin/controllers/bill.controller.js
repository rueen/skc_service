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

/**
 * 导出账单数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function exportBills(req, res) {
  try {
    const { 
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
    
    // 构建筛选条件
    const filters = {
      exportMode: true // 使用导出模式，不分页
    };
    
    if (keyword) filters.keyword = keyword;
    if (memberNickname) filters.memberNickname = memberNickname;
    if (billType) filters.billType = billType;
    if (settlementStatus) filters.settlementStatus = settlementStatus;
    if (billNo) filters.billNo = billNo;
    if (taskName) filters.taskName = taskName;
    if (startTime) filters.startTime = startTime;
    if (endTime) filters.endTime = endTime;
    if (relatedGroupId) filters.relatedGroupId = parseInt(relatedGroupId, 10);
    
    // 获取账单列表数据
    const result = await billModel.getAllBills(filters, 1, 10000); // page和pageSize在导出模式下会被忽略
    const bills = result.list;
    
    if (!bills || bills.length === 0) {
      return res.status(404).send('没有符合条件的账单数据');
    }
    
    // 创建Excel工作簿和工作表
    const Excel = require('exceljs');
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('账单列表');
    
    // 设置列定义和宽度
    worksheet.columns = [
      { header: '账单编号', key: 'billNo', width: 25 },
      { header: '会员ID', key: 'memberNickname', width: 15 },
      { header: '会员账号', key: 'memberAccount', width: 20 },
      { header: '账单类型', key: 'billType', width: 15 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '任务名称', key: 'taskName', width: 25 },
      { header: '关联群组', key: 'relatedGroupName', width: 20 },
      { header: '关联会员', key: 'relatedMemberNickname', width: 15 },
      { header: '结算状态', key: 'settlementStatus', width: 12 },
      { header: '提现状态', key: 'withdrawalStatus', width: 12 },
      { header: '拒绝原因', key: 'rejectReason', width: 12 },
      { header: '操作员', key: 'waiterUsername', width: 15 },
      { header: '创建时间', key: 'createTime', width: 20 },
      { header: '更新时间', key: 'updateTime', width: 20 },
      { header: '备注', key: 'remark', width: 30 }
    ];
    
    // 添加数据行
    bills.forEach(item => {
      worksheet.addRow({
        billNo: item.billNo || '',
        memberNickname: item.memberNickname || '',
        memberAccount: item.memberAccount || '',
        billType: getBillTypeText(item.billType) || '',
        amount: item.amount || 0,
        taskName: item.taskName || '',
        relatedGroupName: item.relatedGroupName || '',
        relatedMemberNickname: item.relatedMemberNickname || '',
        settlementStatus: getSettlementStatusText(item.settlementStatus) || '',
        withdrawalStatus: getWithdrawalStatusText(item.withdrawalStatus) || '',
        rejectReason: item.failureReason || '',
        waiterUsername: item.waiterUsername || '',
        createTime: item.createTime || '',
        updateTime: item.updateTime || '',
        remark: item.remark || ''
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
    res.setHeader('Content-Disposition', 'attachment; filename=bills.xlsx');
    
    // 写入响应流
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error(`导出账单数据失败: ${error.message}`);
    return responseUtil.serverError(res, '导出账单数据失败，请稍后重试');
  }
}

/**
 * 获取账单类型文本
 * @param {string} billType - 账单类型
 * @returns {string} 账单类型文本
 */
function getBillTypeText(billType) {
  const typeMap = {
    'task_reward': '任务奖励',
    'invite_reward': '邀请奖励',
    'withdrawal': '提现',
    'refund': '退款',
    'other': '其他'
  };
  return typeMap[billType] || billType;
}

/**
 * 获取结算状态文本
 * @param {string} status - 结算状态
 * @returns {string} 结算状态文本
 */
function getSettlementStatusText(status) {
  const statusMap = {
    'pending': '待结算',
    'success': '已结算',
    'failed': '结算失败'
  };
  return statusMap[status] || status;
}

/**
 * 获取提现状态文本
 * @param {string} status - 提现状态
 * @returns {string} 提现状态文本
 */
function getWithdrawalStatusText(status) {
  const statusMap = {
    'pending': '待处理',
    'success': '已完成',
    'failed': '已拒绝'
  };
  return statusMap[status] || status;
}

module.exports = {
  list,
  exportBills
}; 