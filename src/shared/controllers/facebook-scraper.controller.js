/**
 * Facebook 数据抓取控制器
 * 处理 Facebook 数据抓取的 API 请求
 * 使用 Playwright 服务池优化高并发性能
 */
const { body, validationResult } = require('express-validator');
const FacebookScraperPlaywrightPoolService = require('../services/facebook-scraper-playwright-pool.service');
const { logger } = require('../config/logger.config');
const responseUtil = require('../utils/response.util');

class FacebookScraperController {
  constructor() {
    // 使用 Playwright 服务池优化高并发性能
    this.playwrightPoolService = new FacebookScraperPlaywrightPoolService({
      maxInstances: 8,          // 最大8个并发实例
      instanceTimeout: 300000,  // 5分钟超时
      maxQueueSize: 50,         // 最大50个等待队列
      cleanupInterval: 120000   // 2分钟清理一次
    });
    
    logger.info('[FB-CONTROLLER] Facebook 抓取控制器已初始化 - 使用 Playwright 高并发服务池');
  }

  /**
   * 获取池状态
   * @returns {Object} 池统计信息
   */
  getPoolStats() {
    return this.playwrightPoolService.getStats();
  }

  /**
   * 关闭服务池（用于应用程序关闭时清理资源）
   */
  async shutdown() {
    logger.info('[FB-CONTROLLER] 正在关闭 Facebook 抓取服务池...');
    await this.playwrightPoolService.shutdown();
    logger.info('[FB-CONTROLLER] Facebook 抓取服务池已关闭');
  }

  /**
   * 验证请求参数的中间件
   */
  static getValidationRules() {
    return [
      body('url')
        .notEmpty()
        .withMessage('URL 不能为空')
        .isURL()
        .withMessage('请提供有效的 URL')
        .custom((value) => {
          // 验证是否为 Facebook 链接
          const facebookDomains = [
            'facebook.com',
            'www.facebook.com',
            'web.facebook.com',
            'm.facebook.com'
          ];
          
          try {
            const url = new URL(value);
            const isValidDomain = facebookDomains.some(domain => 
              url.hostname === domain || url.hostname.endsWith('.' + domain)
            );
            
            if (!isValidDomain) {
              throw new Error('请提供有效的 Facebook 链接');
            }
            
            return true;
          } catch (error) {
            throw new Error('请提供有效的 Facebook 链接');
          }
        }),
      
      body('type')
        .optional()
        .isIn(['profile', 'post', 'group'])
        .withMessage('类型必须是 profile、post 或 group 之一'),
      
      body('engine')
        .optional()
        .isIn(['playwright'])
        .withMessage('引擎必须是 playwright'),
      
      body('options')
        .optional()
        .isObject()
        .withMessage('选项必须是对象类型'),
      
      body('options.timeout')
        .optional()
        .isInt({ min: 10000, max: 180000 })
        .withMessage('超时时间必须在 10000-180000 毫秒之间'),
      
      body('options.retries')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('重试次数必须在 1-5 次之间'),
      
      body('options.headless')
        .optional()
        .isBoolean()
        .withMessage('headless 必须是布尔值')
    ];
  }

  /**
   * 抓取 Facebook 数据（单个请求）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async scrapeData(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return responseUtil.error(res, '请求参数验证失败', 'VALIDATION_ERROR', 400);
      }

      const { url, type, engine = 'playwright', options = {} } = req.body;
      
      logger.info(`[FB-CONTROLLER] 开始抓取 Facebook 数据: ${url}，使用引擎: ${engine}`);
      
      // 验证引擎类型
      if (engine !== 'playwright') {
        return responseUtil.error(res, '当前仅支持 playwright 引擎', 'UNSUPPORTED_ENGINE', 400);
      }
      
      // 使用 Playwright 服务池
      const scraperService = this.playwrightPoolService;
      
      // 如果没有指定类型，自动识别
      let dataType = type;
      if (!dataType) {
        dataType = this.playwrightPoolService.identifyLinkType(url);
        logger.info(`[FB-CONTROLLER] 自动识别链接类型: ${dataType}`);
      }
      
      // 执行数据抓取
      const result = await scraperService.scrapeData(url, dataType, options);
      
      if (result.success) {
        logger.info(`[FB-CONTROLLER] 数据抓取成功: ${url}`);
        
        // 返回简化的成功响应
        return responseUtil.success(res, result.data, '数据抓取成功');
      } else {
        // 抓取失败但服务正常
        logger.warn(`[FB-CONTROLLER] 数据抓取失败: ${url}`, result.error);
        return responseUtil.error(res, 
          result.error?.message || '数据抓取失败', 
          result.error?.code || 'SCRAPE_FAILED',
          422
        );
      }
      
    } catch (error) {
      logger.error('[FB-CONTROLLER] Facebook 数据抓取异常:', error);
      return responseUtil.error(res, '服务器内部错误', 'INTERNAL_ERROR', 500);
    }
  }



  /**
   * 批量抓取 Facebook 数据（高并发优化）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async batchScrapeData(req, res) {
    try {
      const { urls, engine = 'playwright', options = {} } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return responseUtil.error(res, 'urls 必须是非空数组', 'VALIDATION_ERROR', 400);
      }
      
      // 验证引擎类型
      if (engine !== 'playwright') {
        return responseUtil.error(res, '当前仅支持 playwright 引擎', 'UNSUPPORTED_ENGINE', 400);
      }
      
      // Playwright 服务池支持最多50个链接的批量抓取
      const maxBatchSize = 50;
      if (urls.length > maxBatchSize) {
        return responseUtil.error(res, `批量抓取最多支持 ${maxBatchSize} 个链接`, 'VALIDATION_ERROR', 400);
      }
      
      logger.info(`[FB-CONTROLLER] 开始批量抓取 Facebook 数据: ${urls.length} 个链接，使用 Playwright 引擎`);
      
      // 使用服务池的高性能批量抓取
      const requests = urls.map(urlData => {
        const { url, type } = typeof urlData === 'string' ? { url: urlData, type: null } : urlData;
        const dataType = type || this.playwrightPoolService.identifyLinkType(url);
        
        return {
          url,
          type: dataType,
          options
        };
      });
      
      // 使用服务池的批量抓取方法
      const result = await this.playwrightPoolService.batchScrapeData(requests, {
        concurrency: Math.min(8, requests.length) // 最大并发8个
      });
      
      logger.info(`[FB-CONTROLLER] 服务池批量抓取完成: ${result.summary.successful} 成功, ${result.summary.failed} 失败`);
      
      return responseUtil.success(res, {
        results: result.results,
        summary: {
          total: result.summary.total,
          successful: result.summary.successful,
          failed: result.summary.failed,
          totalTime: result.summary.totalTime
        }
      }, '批量抓取完成');
      
    } catch (error) {
      logger.error('[FB-CONTROLLER] 批量抓取 Facebook 数据异常:', error);
      return responseUtil.error(res, '服务器内部错误', 'INTERNAL_ERROR', 500);
    }
  }

}

// 全局服务池实例管理器
class FacebookScraperServiceManager {
  constructor() {
    this.controllerInstances = new Set();
  }

  /**
   * 注册控制器实例
   * @param {FacebookScraperController} instance 
   */
  registerController(instance) {
    this.controllerInstances.add(instance);
  }

  /**
   * 注销控制器实例
   * @param {FacebookScraperController} instance 
   */
  unregisterController(instance) {
    this.controllerInstances.delete(instance);
  }

  /**
   * 关闭所有服务池（用于应用程序关闭时）
   */
  async shutdownAll() {
    const { logger } = require('../config/logger.config');
    logger.info('[FB-SERVICE-MANAGER] 开始关闭所有 Facebook 抓取服务池...');
    
    const shutdownPromises = Array.from(this.controllerInstances).map(async (instance) => {
      try {
        await instance.shutdown();
      } catch (error) {
        logger.error('[FB-SERVICE-MANAGER] 关闭服务池时出错:', error);
      }
    });
    
    await Promise.all(shutdownPromises);
    logger.info('[FB-SERVICE-MANAGER] 所有 Facebook 抓取服务池已关闭');
  }
}

// 全局单例实例
const serviceManager = new FacebookScraperServiceManager();

// 修改原构造函数以注册到管理器
const OriginalConstructor = FacebookScraperController;
FacebookScraperController = function(...args) {
  const instance = new OriginalConstructor(...args);
  serviceManager.registerController(instance);
  
  // 添加析构函数
  const originalShutdown = instance.shutdown.bind(instance);
  instance.shutdown = async function() {
    await originalShutdown();
    serviceManager.unregisterController(this);
  };
  
  return instance;
};

// 保持原型链
FacebookScraperController.prototype = OriginalConstructor.prototype;
FacebookScraperController.getValidationRules = OriginalConstructor.getValidationRules;

// 导出管理器用于应用程序关闭处理
FacebookScraperController.serviceManager = serviceManager;

module.exports = FacebookScraperController; 