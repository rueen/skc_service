/**
 * 群组控制器
 * 处理群组相关的业务逻辑
 */
const groupModel = require('../../shared/models/group.model');
const responseUtil = require('../../shared/utils/response.util');
const { logger } = require('../../shared/config/logger.config');
const { DEFAULT_PAGE_SIZE, DEFAULT_PAGE } = require('../../shared/config/api.config');
const i18n = require('../../shared/utils/i18n.util');

/**
 * 获取群组列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function list(req, res) {
  try {
    const { page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE, groupName, ownerId, memberId, keyword } = req.query;
    
    // 构建筛选条件
    const filters = {};
    if (groupName) filters.groupName = groupName;
    if (ownerId) filters.ownerId = parseInt(ownerId, 10);
    if (memberId) filters.memberId = parseInt(memberId, 10); // 处理新增的成员ID筛选
    if (keyword) filters.keyword = keyword;
    
    // 获取群组列表
    const result = await groupModel.getList(filters, page, pageSize);
    
    return responseUtil.success(res, result);
  } catch (error) {
    logger.error(`获取群组列表失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取群组详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function get(req, res) {
  try {
    const { id } = req.params;
    const group = await groupModel.getById(parseInt(id, 10));
    
    if (!group) {
      return responseUtil.notFound(res, i18n.t('admin.group.notFound', req.lang));
    }

    return responseUtil.success(res, group);
  } catch (error) {
    logger.error(`获取群组详情失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 创建群组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function create(req, res) {
  try {
    const { groupName, groupLink, ownerId } = req.body;

    // 参数验证
    if (!groupName || !groupLink) {
      return responseUtil.badRequest(res, '群组名称和群组链接不能为空');
    }

    if (groupName.length > 50) {
      return responseUtil.badRequest(res, '群组名称长度不能超过50个字符');
    }

    const result = await groupModel.create({
      groupName,
      groupLink,
      ownerId: ownerId ? parseInt(ownerId, 10) : null
    });

    return responseUtil.success(res, result);
  } catch (error) {
    if (error.message === '群主不存在') {
      return responseUtil.badRequest(res, i18n.t('admin.group.ownerNotFound', req.lang));
    }
    logger.error(`创建群组失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 更新群组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function update(req, res) {
  try {
    const { id } = req.params;
    const { groupName, groupLink, ownerId } = req.body;

    // 参数验证
    if (groupName && groupName.length > 50) {
      return responseUtil.badRequest(res, '群组名称长度不能超过50个字符');
    }

    // 处理 ownerId
    let parsedOwnerId;
    if (ownerId === undefined || ownerId === null) {
      // ownerId 为 undefined 或 null 都表示删除群主
      parsedOwnerId = null;
    } else {
      // 如果提供了 ownerId，转换为整数
      parsedOwnerId = parseInt(ownerId, 10);
    }

    const result = await groupModel.update({
      id: parseInt(id, 10),
      groupName,
      groupLink,
      ownerId: parsedOwnerId
    });

    if (!result) {
      return responseUtil.notFound(res, i18n.t('admin.group.notFound', req.lang));
    }

    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === '群组不存在') {
      return responseUtil.notFound(res, i18n.t('admin.group.notFound', req.lang));
    }
    if (error.message === '新群主不存在') {
      return responseUtil.badRequest(res, i18n.t('admin.group.ownerNotFound', req.lang));
    }
    logger.error(`更新群组失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 删除群组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await groupModel.remove(parseInt(id, 10));

    if (!result) {
      return responseUtil.notFound(res, i18n.t('admin.group.notFound', req.lang));
    }

    return responseUtil.success(res, null);
  } catch (error) {
    if (error.message === '群组不存在') {
      return responseUtil.notFound(res, i18n.t('admin.group.notFound', req.lang));
    }
    if (error.message === '该群组下存在关联会员，无法删除') {
      return responseUtil.badRequest(res, i18n.t('admin.group.associatedMember', req.lang));
    }
    logger.error(`删除群组失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

/**
 * 获取群主名下群统计信息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getOwnerGroupStats(req, res) {
  try {
    const { memberId } = req.params;
    
    if (!memberId) {
      return responseUtil.badRequest(res, '会员ID不能为空');
    }
    
    const stats = await groupModel.getOwnerGroupStats(parseInt(memberId, 10));
    
    return responseUtil.success(res, stats);
  } catch (error) {
    logger.error(`获取群主统计信息失败: ${error.message}`);
    return responseUtil.serverError(res);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
  getOwnerGroupStats
}; 