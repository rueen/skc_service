/**
 * 任务调度控制器
 */
const { updateTaskStatus, startScheduler, stopScheduler } = require('../services/task-scheduler.service');
const { taskStatusUpdateConfig, schedulerServiceConfig } = require('../config/scheduler.config');
const { logger } = require('../config/logger.config');
const fs = require('fs');
const path = require('path');
const responseUtil = require('../utils/response.util');

// 从服务模块中导入调度任务引用
const taskSchedulerService = require('../services/task-scheduler.service');

/**
 * 手动触发任务状态更新
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function triggerTaskStatusUpdate(req, res) {
  try {
    const result = await updateTaskStatus();
    
    if (result.success) {
      return responseUtil.success(res, {
        updatedToProcessing: result.updatedToProcessing,
        updatedToEnded: result.updatedToEnded
      }, '任务状态更新成功');
    } else {
      return responseUtil.serverError(res, '任务状态更新失败');
    }
  } catch (error) {
    logger.error(`手动触发任务状态更新失败: ${error.message}`);
    return responseUtil.serverError(res, '任务状态更新失败，请稍后重试');
  }
}

/**
 * 重新配置任务调度器
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function reconfigureScheduler(req, res) {
  try {
    const { cronExpression, isEnabled, environment } = req.body;
    
    // 验证参数
    if (!cronExpression || !environment) {
      return responseUtil.badRequest(res, '缺少必要参数: cronExpression, environment');
    }
    
    // 验证cron表达式格式
    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
    if (!cronRegex.test(cronExpression)) {
      return responseUtil.badRequest(res, 'Cron表达式格式不正确');
    }
    
    // 验证环境
    const validEnvironments = ['development', 'production', 'test'];
    if (!validEnvironments.includes(environment)) {
      return responseUtil.badRequest(res, '无效的环境，有效值为: development, production, test');
    }
    
    // 更新配置
    const configPath = path.join(__dirname, '../config/scheduler.config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // 替换配置
    const regex = new RegExp(`(taskStatusUpdateConfig\\s*=\\s*\\{[\\s\\S]*?${environment}\\s*:\\s*\\{[\\s\\S]*?cronExpression\\s*:\\s*['"\`])([^'"\`]*?)(['"\`][\\s\\S]*?isEnabled\\s*:\\s*)(true|false)`, 'g');
    const newContent = configContent.replace(regex, `$1${cronExpression}$3${isEnabled === false ? 'false' : 'true'}`);
    
    // 写入文件
    fs.writeFileSync(configPath, newContent, 'utf8');
    
    // 重启调度器
    await stopScheduler();
    await startScheduler();
    
    return responseUtil.success(res, {
      cronExpression,
      isEnabled: isEnabled !== false,
      environment
    }, '任务调度器配置更新成功');
  } catch (error) {
    logger.error(`重新配置任务调度器失败: ${error.message}`);
    return responseUtil.serverError(res, '重新配置任务调度器失败，请稍后重试');
  }
}

/**
 * 获取当前任务调度器配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getSchedulerConfig(req, res) {
  try {
    const currentEnvironment = process.env.NODE_ENV || 'development';
    const currentConfig = taskStatusUpdateConfig[currentEnvironment];
    
    return responseUtil.success(res, {
      development: taskStatusUpdateConfig.development,
      production: taskStatusUpdateConfig.production,
      test: taskStatusUpdateConfig.test,
      currentEnvironment,
      currentConfig,
      schedulerServiceConfig
    }, '获取任务调度器配置成功');
  } catch (error) {
    logger.error(`获取任务调度器配置失败: ${error.message}`);
    return responseUtil.serverError(res, '获取任务调度器配置失败，请稍后重试');
  }
}

/**
 * 设置调度器运行的服务实例
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function setSchedulerServiceConfig(req, res) {
  try {
    const { service } = req.body;
    
    if (!service) {
      return responseUtil.badRequest(res, '缺少必要参数: service');
    }
    
    // 验证服务名称
    const validServices = ['admin', 'h5'];
    if (!validServices.includes(service)) {
      return responseUtil.badRequest(res, '无效的服务名称，有效值为: admin, h5');
    }
    
    // 更新配置
    const configPath = path.join(__dirname, '../config/scheduler.config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // 替换配置
    const regex = new RegExp(`(schedulerServiceConfig\\s*=\\s*\\{[\\s\\S]*?runOnService\\s*:\\s*['"\`])([^'"\`]*?)(['"\`])`, 'g');
    const newContent = configContent.replace(regex, `$1${service}$3`);
    
    // 写入文件
    fs.writeFileSync(configPath, newContent, 'utf8');
    
    // 重启调度器（如果当前服务是新的运行服务）
    const currentService = process.env.SERVICE_NAME || 'admin';
    if (currentService === service) {
      await stopScheduler();
      await startScheduler();
    }
    
    return responseUtil.success(res, {
      service,
      previousService: schedulerServiceConfig.runOnService
    }, '调度器服务配置更新成功');
  } catch (error) {
    logger.error(`设置调度器运行服务实例失败: ${error.message}`);
    return responseUtil.serverError(res, '设置调度器运行服务实例失败，请稍后重试');
  }
}

module.exports = {
  triggerTaskStatusUpdate,
  reconfigureScheduler,
  getSchedulerConfig,
  setSchedulerServiceConfig
}; 