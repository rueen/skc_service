/**
 * 任务调度控制器
 */
const { updateTaskStatus, startScheduler, stopScheduler } = require('../services/task-scheduler.service');
const { taskStatusUpdateConfig, schedulerServiceConfig } = require('../config/scheduler.config');
const logger = require('../config/logger.config');
const fs = require('fs');
const path = require('path');

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
      return res.json({
        code: 200,
        data: {
          updatedToProcessing: result.updatedToProcessing,
          updatedToEnded: result.updatedToEnded
        },
        message: '任务状态更新成功'
      });
    } else {
      return res.status(500).json({
        code: 500,
        data: null,
        message: `任务状态更新失败: ${result.error}`
      });
    }
  } catch (error) {
    logger.error(`手动触发任务状态更新失败: ${error.message}`);
    return res.status(500).json({
      code: 500,
      data: null,
      message: `任务状态更新失败: ${error.message}`
    });
  }
}

/**
 * 重新配置任务调度
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function reconfigureScheduler(req, res) {
  try {
    // 获取请求参数
    const { schedule, runImmediately = false, environment = process.env.NODE_ENV || 'development' } = req.body;
    
    if (!schedule) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '调度表达式不能为空'
      });
    }
    
    // 获取当前服务类型
    const currentService = req.app.get('appType') || 'unknown';
    
    // 判断当前服务是否负责运行此任务
    if (currentService !== schedulerServiceConfig.taskStatusUpdateService) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: `当前服务实例(${currentService})不负责运行定时任务，请在 ${schedulerServiceConfig.taskStatusUpdateService} 服务中进行配置`
      });
    }
    
    // 停止现有的调度任务
    stopScheduler();
    
    // 启动新的调度任务
    const schedulerTask = startScheduler({ 
      schedule, 
      runImmediately 
    });
    
    return res.json({
      code: 200,
      data: {
        environment,
        schedule,
        runImmediately,
        service: currentService
      },
      message: '任务调度重新配置成功'
    });
  } catch (error) {
    logger.error(`重新配置任务调度失败: ${error.message}`);
    return res.status(500).json({
      code: 500,
      data: null,
      message: `重新配置任务调度失败: ${error.message}`
    });
  }
}

/**
 * 获取当前任务调度配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function getSchedulerConfig(req, res) {
  try {
    const environment = process.env.NODE_ENV || 'development';
    const currentService = req.app.get('appType') || 'unknown';
    
    return res.json({
      code: 200,
      data: {
        environment,
        service: {
          current: currentService,
          responsible: schedulerServiceConfig.taskStatusUpdateService
        },
        config: taskStatusUpdateConfig[environment] || taskStatusUpdateConfig.development
      },
      message: '获取任务调度配置成功'
    });
  } catch (error) {
    logger.error(`获取任务调度配置失败: ${error.message}`);
    return res.status(500).json({
      code: 500,
      data: null,
      message: `获取任务调度配置失败: ${error.message}`
    });
  }
}

/**
 * 设置定时任务服务配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
async function setSchedulerServiceConfig(req, res) {
  try {
    // 获取请求参数
    const { service } = req.body;
    
    if (!service || (service !== 'admin' && service !== 'h5')) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '服务类型必须是 admin 或 h5'
      });
    }
    
    // 获取当前服务类型
    const currentService = req.app.get('appType') || 'unknown';
    
    // 更新配置
    const configFilePath = path.join(__dirname, '../config/scheduler.config.js');
    const configContent = fs.readFileSync(configFilePath, 'utf8');
    
    // 使用正则表达式更新 taskStatusUpdateService 的值
    const updatedContent = configContent.replace(
      /(taskStatusUpdateService\s*:\s*['"])([^'"]+)(['"])/,
      `$1${service}$3`
    );
    
    if (updatedContent === configContent) {
      return res.status(400).json({
        code: 400,
        data: null,
        message: '配置文件未找到或格式不正确'
      });
    }
    
    // 写入更新后的配置
    fs.writeFileSync(configFilePath, updatedContent, 'utf8');
    
    // 更新内存中的配置
    schedulerServiceConfig.taskStatusUpdateService = service;
    
    // 如果当前服务就是新设置的服务，且定时任务未启动，则启动定时任务
    let startedTask = false;
    if (currentService === service) {
      const environment = process.env.NODE_ENV || 'development';
      const config = taskStatusUpdateConfig[environment] || taskStatusUpdateConfig.development;
      
      // 检查任务调度器是否已有任务在运行
      const hasRunningTask = taskSchedulerService.isSchedulerRunning();
      if (!hasRunningTask) {
        startScheduler(config);
        startedTask = true;
      }
    } else {
      // 如果当前服务不是新设置的服务，但定时任务正在运行，则停止定时任务
      if (currentService === schedulerServiceConfig.taskStatusUpdateService) {
        stopScheduler();
      }
    }
    
    return res.json({
      code: 200,
      data: {
        service,
        previousService: currentService,
        startedTask
      },
      message: `任务调度服务配置已更新为 ${service}`
    });
  } catch (error) {
    logger.error(`设置定时任务服务配置失败: ${error.message}`);
    return res.status(500).json({
      code: 500,
      data: null,
      message: `设置定时任务服务配置失败: ${error.message}`
    });
  }
}

module.exports = {
  triggerTaskStatusUpdate,
  reconfigureScheduler,
  getSchedulerConfig,
  setSchedulerServiceConfig
}; 