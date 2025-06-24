/**
 * FB老账号管理控制器
 * 处理管理端FB老账号相关的业务逻辑
 */
const oldAccountsFbModel = require('../../shared/models/old-accounts-fb.model');
const { logger } = require('../../shared/config/logger.config');
const responseUtil = require('../../shared/utils/response.util');
const { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } = require('../../shared/config/api.config');
const xlsx = require('xlsx');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取FB老账号列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getOldAccountsFb(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, keyword, memberId } = req.query;
    
    // 构建筛选条件
    const filters = {};
    
    if (keyword) {
      filters.keyword = keyword;
    }
    
    if (memberId) {
      filters.memberId = parseInt(memberId, 10);
    }
    
    // 调用模型获取FB老账号列表
    const result = await oldAccountsFbModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, {
      total: result.pagination.total,
      list: result.list,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10)
    });
  } catch (error) {
    logger.error(`获取FB老账号列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 导入FB老账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function importOldAccountsFb(req, res) {
  try {
    if (!req.file) {
      return responseUtil.badRequest(res, '请上传Excel文件');
    }
    
    // 解析Excel文件
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return responseUtil.badRequest(res, '文件中没有数据');
    }
    
    // 验证数据格式
    const accounts = [];
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel是从1开始的，第一行是表头
      
      // 检查必填字段
      if (!row.uid) {
        errors.push(`第${rowNum}行: FB账户(uid)不能为空`);
        continue;
      }
      
      if (!row.nickname) {
        errors.push(`第${rowNum}行: FB昵称(nickname)不能为空`);
        continue;
      }
      
      // 添加到导入列表
      accounts.push({
        uid: row.uid.toString().trim(),
        nickname: row.nickname.toString().trim(),
        homeUrl: row.homeUrl || row.home_url || null
      });
    }
    
    if (errors.length > 0) {
      return responseUtil.badRequest(res, errors.join('\n'));
    }
    
    // 调用模型导入数据
    const result = await oldAccountsFbModel.importAccounts(accounts);
    
    return responseUtil.success(res, result, `导入成功: 总计${result.total}条数据，更新${result.updated}条，新增${result.inserted}条，跳过${result.skipped}条(已关联会员的记录)`);
  } catch (error) {
    logger.error(`导入FB老账号失败: ${error.message}`);
    return responseUtil.serverError(res, '导入FB老账号失败');
  }
}

/**
 * 添加FB老账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function addOldAccountFb(req, res) {
  try {
    const { uid, nickname, homeUrl } = req.body;
    
    // 添加FB老账号
    const accountData = {
      uid,
      nickname,
      homeUrl: homeUrl || null
    };
    
    const newAccount = await oldAccountsFbModel.create(accountData);
    
    return responseUtil.success(res, newAccount, '添加FB老账号成功');
  } catch (error) {
    logger.error(`添加FB老账号失败: ${error.message}`);
    
    if (error.message.includes('该UID已存在')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '添加FB老账号失败');
  }
}

/**
 * 更新FB老账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function updateOldAccountFb(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { uid, nickname, homeUrl } = req.body;
    
    if (isNaN(id)) {
      return responseUtil.badRequest(res, '无效的ID');
    }
    
    // 更新FB老账号
    const accountData = {
      id,
      uid,
      nickname,
      homeUrl
    };
    
    const result = await oldAccountsFbModel.update(accountData);
    
    if (!result) {
      return responseUtil.notFound(res, 'FB老账号不存在');
    }
    
    return responseUtil.success(res, { success: true }, '更新FB老账号成功');
  } catch (error) {
    logger.error(`更新FB老账号失败: ${error.message}`);
    
    if (error.message.includes('FB老账号不存在')) {
      return responseUtil.notFound(res, error.message);
    }
    
    if (error.message.includes('该UID已被其他账号使用')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '更新FB老账号失败');
  }
}

/**
 * 删除FB老账号
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function deleteOldAccountFb(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return responseUtil.badRequest(res, '无效的ID');
    }
    
    // 删除FB老账号
    const result = await oldAccountsFbModel.remove(id);
    
    if (!result) {
      return responseUtil.notFound(res, 'FB老账号不存在');
    }
    
    return responseUtil.success(res, { success: true }, '删除FB老账号成功');
  } catch (error) {
    logger.error(`删除FB老账号失败: ${error.message}`);
    
    if (error.message.includes('FB老账号不存在')) {
      return responseUtil.notFound(res, error.message);
    }
    
    if (error.message.includes('已关联会员')) {
      return responseUtil.badRequest(res, error.message);
    }
    
    return responseUtil.serverError(res, '删除FB老账号失败');
  }
}

module.exports = {
  getOldAccountsFb,
  importOldAccountsFb,
  addOldAccountFb,
  updateOldAccountFb,
  deleteOldAccountFb
}; 