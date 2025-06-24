/**
 * Facebook 数据抓取控制器
 * 处理 Facebook 数据抓取的 API 请求
 */
const { body, validationResult } = require('express-validator');
const FacebookScraperPuppeteerService = require('../services/facebook-scraper-puppeteer.service');
const logger = require('../config/logger.config');
const responseUtil = require('../utils/response.util');

class FacebookScraperController {
  constructor() {
    this.puppeteerService = new FacebookScraperPuppeteerService();
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
   * 抓取 Facebook 数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async scrapeData(req, res) {
    try {
      // 验证请求参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
      }

      const { url, type, options = {} } = req.body;
      
      logger.info(`开始抓取 Facebook 数据: ${url}，使用引擎: puppeteer`);
      
      // 使用 Puppeteer 服务实例
      const scraperService = this.puppeteerService;
      
      // 如果没有指定类型，自动识别
      let dataType = type;
      if (!dataType) {
        dataType = scraperService.identifyLinkType(url);
        logger.info(`自动识别链接类型: ${dataType}`);
      }
      
      // 执行数据抓取
      const result = await scraperService.scrapeData(url, dataType, options);
      
      if (result.success) {
        logger.info(`数据抓取成功: ${url}`);
        // 构建成功响应，包含额外的元数据
        const responseData = {
          ...result.data,
          _meta: {
            type: result.type,
            timestamp: result.timestamp
          }
        };
        return responseUtil.success(res, responseData, '数据抓取成功');
      } else {
        logger.error(`数据抓取失败: ${url}`, result.error);
        return res.status(500).json({
          success: false,
          error: result.error,
          timestamp: result.timestamp
        });
      }
      
    } catch (error) {
      logger.error('Facebook 数据抓取异常:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          details: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 批量抓取 Facebook 数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async batchScrapeData(req, res) {
    try {
      const { urls, options = {} } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'urls 必须是非空数组',
            details: []
          },
          timestamp: new Date().toISOString()
        });
      }
      
      if (urls.length > 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '批量抓取最多支持 10 个链接',
            details: []
          },
          timestamp: new Date().toISOString()
        });
      }
      
      logger.info(`开始批量抓取 Facebook 数据: ${urls.length} 个链接，使用引擎: puppeteer`);
      
      const results = [];
      
      // 并发抓取（限制并发数为 3）
      const concurrencyLimit = 3;
      for (let i = 0; i < urls.length; i += concurrencyLimit) {
        const batch = urls.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(async (urlData) => {
          try {
            const { url, type } = typeof urlData === 'string' ? { url: urlData, type: null } : urlData;
            
            // 创建新的 Puppeteer 服务实例以支持并发
            const scraperService = new (require('../services/facebook-scraper-puppeteer.service'))();
            
            // 自动识别类型
            const dataType = type || scraperService.identifyLinkType(url);
            
            const result = await scraperService.scrapeData(url, dataType, options);
            
            return {
              url,
              type: dataType,
              ...result
            };
          } catch (error) {
            return {
              url: typeof urlData === 'string' ? urlData : urlData.url,
              success: false,
              error: {
                code: 'SCRAPE_ERROR',
                message: '抓取失败',
                details: error.message
              }
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      logger.info(`批量抓取完成: 成功 ${successCount} 个，失败 ${failCount} 个`);
      
      return res.status(200).json({
        success: true,
        message: '批量抓取完成',
        data: results,
        meta: {
          total: results.length,
          success: successCount,
          failed: failCount,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('批量抓取 Facebook 数据异常:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误',
          details: error.message
        },
        timestamp: new Date().toISOString()
      });
    }
  }


}

module.exports = FacebookScraperController; 