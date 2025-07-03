/**
 * Facebook 数据抓取服务池 (Playwright)
 * 支持高并发的抓取服务管理器
 * 解决单实例模式的资源竞争问题
 */
const { chromium } = require('playwright');
const { logger, scrapeFailureLogger, scrapeSuccessLogger } = require('../config/logger.config');
const FacebookRedirectTrackerService = require('./facebook-redirect-tracker.service');

/**
 * 轻量化的抓取服务 - 专为服务池优化
 */
class LightweightScraperService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    // 初始化重定向跟踪器
    this.redirectTracker = new FacebookRedirectTrackerService();
  }

  /**
   * 初始化浏览器
   */
  async initBrowser() {
    // 随机User-Agent列表
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    
    // 增强的启动参数
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-automation',
        '--exclude-switches=enable-automation',
        '--disable-extensions',
        '--mute-audio',
        '--memory-pressure-off',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-translate',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection'
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=IdleDetection']
    };

    // Linux 环境使用系统浏览器
    if (process.platform === 'linux') {
      const fs = require('fs');
      const browserPaths = ['/snap/bin/chromium', '/usr/bin/chromium-browser'];
      
      for (const path of browserPaths) {
        if (fs.existsSync(path)) {
          launchOptions.executablePath = path;
          break;
        }
      }
    }

    this.browser = await chromium.launch(launchOptions);
    
    // 随机选择User-Agent
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // 增强的上下文配置
    this.context = await this.browser.newContext({
      viewport: { 
        width: 1920 + Math.floor(Math.random() * 100), 
        height: 1080 + Math.floor(Math.random() * 100) 
      },
      userAgent: randomUserAgent,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      defaultTimeout: 15000,
      defaultNavigationTimeout: 30000,
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true,
      acceptDownloads: false,
      hasTouch: false,
      isMobile: false,
      permissions: [],
      geolocation: { latitude: 40.7128, longitude: -74.0060 }, // New York
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    // 增强的反检测脚本
    await this.context.addInitScript(() => {
      // 移除webdriver属性
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
      
      // 模拟真实的插件
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin},
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          }
        ],
      });
      
      // 模拟真实的语言
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // 隐藏自动化相关属性
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
      
      // 修改Chrome对象
      if (window.chrome) {
        window.chrome.runtime = {
          onConnect: undefined,
          onMessage: undefined
        };
      }
    });

    this.page = await this.context.newPage();
    
    // 设置随机延迟
    this.randomDelay = () => {
      const delay = 1000 + Math.random() * 2000; // 1-3秒随机延迟
      return new Promise(resolve => setTimeout(resolve, delay));
    };
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      // 静默处理关闭错误
    }
  }

  /**
   * 抓取数据的核心方法
   * @param {string} url - Facebook 链接
   * @param {string} type - 链接类型 ('profile', 'post', 'group')
   * @param {Object} options - 选项配置
   * @returns {Object} 抓取结果
   */
  async scrapeData(url, type, options = {}) {
    const startTime = Date.now();
    
    try {
      // 如果 type 为 'profile' 直接执行浏览器抓取
      if (type === 'profile') {
        // logger.info(`[LW-SCRAPER] 🔍 个人资料类型，直接执行浏览器抓取: ${url}`);
        return await this.performBrowserScraping(url, type);
      }
      
      // 如果 type 为 'post' 或者 'group'，首先执行快速抓取
      // logger.info(`[LW-SCRAPER] ⚡ 尝试快速提取: ${url}, 类型: ${type}`);
      const fastResult = this.tryFastExtract(url, type);
      if (fastResult) {
        // logger.info(`[LW-SCRAPER] ✅ 快速提取成功: ${url}, 方法: ${fastResult.extractMethod}`);
        scrapeSuccessLogger.info(`${JSON.stringify(fastResult)}`);
        return {
          success: true,
          data: fastResult
        };
      }
      
      // 如果快速抓取没有拿到结果，则执行重定向跟踪器
      // logger.info(`[LW-SCRAPER] 🔄 快速提取无结果，尝试重定向跟踪: ${url}`);
      const redirectResult = await this.redirectTracker.trackRedirect(url);
      
      if (redirectResult.success && redirectResult.data.redirected) {
        const redirectedUrl = redirectResult.data.finalUrl;
        // logger.info(`[LW-SCRAPER] 🎯 重定向跟踪成功: ${url} -> ${redirectedUrl}`);
        
        // 检查是否重定向到登录页面
        if (redirectResult.data.isLoginRedirect) {
          // logger.info(`[LW-SCRAPER] 🔓 检测到登录重定向: ${redirectedUrl}`);
          
          // 如果有next参数，对next链接执行快速抓取
          if (redirectResult.data.nextUrl) {
            // logger.info(`[LW-SCRAPER] 📎 对next链接执行快速抓取: ${redirectResult.data.nextUrl}`);
            const nextUrlResult = this.tryFastExtract(redirectResult.data.nextUrl, type, 'login_redirect_next_extract');
            if (nextUrlResult) {
              // logger.info(`[LW-SCRAPER] ✅ next链接快速提取成功: ${redirectResult.data.nextUrl}, 方法: ${nextUrlResult.extractMethod}`);
              // 添加重定向信息
              nextUrlResult.redirectUrl = redirectedUrl;
              nextUrlResult.nextUrl = redirectResult.data.nextUrl;
              nextUrlResult.redirected = true;
              nextUrlResult.isLoginRedirect = true;
              nextUrlResult.redirectTrackingTime = redirectResult.data.trackingTime;
              
              scrapeSuccessLogger.info(`${JSON.stringify(nextUrlResult)}`);
              return {
                success: true,
                data: nextUrlResult
              };
            } else {
              scrapeFailureLogger.info(`${JSON.stringify({
                type: type,
                ...redirectResult.data,
                message: 'next链接快速提取无结果'
              })}`);
              // logger.warn(`[LW-SCRAPER] ⚠️ next链接快速提取无结果: ${redirectResult.data.nextUrl}`);
            }
          } else {
            scrapeFailureLogger.info(`${JSON.stringify({
              type: type,
              ...redirectResult.data,
              message: '登录重定向但无next参数'
            })}`);
                          // logger.warn(`[LW-SCRAPER] ⚠️ 登录重定向但无next参数: ${redirectedUrl}`);
          }
        }
        
        // 将跟踪器获取到的重定向后的URL执行快速抓取
        const redirectFastResult = this.tryFastExtract(redirectedUrl, type, 'redirect_url_match');
        if (redirectFastResult) {
          // logger.info(`[LW-SCRAPER] ✅ 重定向URL快速提取成功: ${redirectedUrl}, 方法: ${redirectFastResult.extractMethod}`);
          // 添加重定向信息
          redirectFastResult.redirectUrl = redirectedUrl;
          redirectFastResult.redirected = true;
          redirectFastResult.isLoginRedirect = redirectResult.data.isLoginRedirect;
          redirectFastResult.redirectTrackingTime = redirectResult.data.trackingTime;
          
          scrapeSuccessLogger.info(`${JSON.stringify(redirectFastResult)}`);
          return {
            success: true,
            data: redirectFastResult
          };
        }
        
        // logger.info(`[LW-SCRAPER] ⚠️ 重定向URL快速提取无结果，执行浏览器抓取: ${redirectedUrl}`);
        // 如果重定向URL快速提取也无结果，执行浏览器抓取（使用重定向后的URL）
        // TODO: 暂时为post和group类型跳过浏览器抓取
        if (type === 'post' || type === 'group') {
          scrapeFailureLogger.info(`${JSON.stringify({
            type: type,
            ...redirectResult.data,
            message: '重定向URL快速提取无结果'
          })}`);
          // logger.info(`[LW-SCRAPER] ⏹️ ${type}类型暂时跳过浏览器抓取: ${redirectedUrl}`);
          return {
            success: true,
            data: {
              type: type,
              originalUrl: url,
              redirectUrl: redirectedUrl,
              nextUrl: redirectResult.data.nextUrl,
              isLoginRedirect: redirectResult.data.isLoginRedirect,
              extractMethod: 'redirect_url_match_failed',
              message: '重定向URL快速提取无结果'
            }
          };
        }
        return await this.performBrowserScraping(redirectedUrl, type, url);
      }
      
      // 如果重定向跟踪失败或没有重定向，执行浏览器抓取
      // logger.info(`[LW-SCRAPER] 🌐 重定向跟踪无效，执行浏览器抓取: ${url}`);
      // TODO: 暂时为post和group类型跳过浏览器抓取
      if (type === 'post' || type === 'group') {
        // logger.info(`[LW-SCRAPER] ⏹️ ${type}类型暂时跳过浏览器抓取: ${url}`);
        scrapeFailureLogger.info(`${JSON.stringify({
          type: type,
          ...redirectResult.data,
          message: '重定向跟踪失败或没有重定向'
        })}`);
        return {
          success: true,
          data: {
            type: type,
            originalUrl: url,
            extractMethod: 'redirect_url_match_failed',
            message: '重定向跟踪失败或没有重定向',
            redirectResult: JSON.stringify(redirectResult)
          }
        };
      }
      return await this.performBrowserScraping(url, type);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`[LW-SCRAPER] ❌ 抓取失败: ${url}, 耗时: ${totalTime}ms`, error);
      
      return {
        success: false,
        error: {
          code: 'SCRAPE_ERROR',
          message: error.message
        }
      };
    }
  }

  /**
   * 执行浏览器抓取
   * @param {string} url - 要抓取的URL
   * @param {string} type - 链接类型
   * @param {string} originalUrl - 原始URL（如果存在重定向）
   * @returns {Object} 抓取结果
   */
  async performBrowserScraping(url, type, originalUrl = null) {
    const startTime = Date.now();
    
    try {
      // 需要浏览器抓取
      await this.initBrowser();
      
      // 真实的浏览行为：先访问Facebook首页
      // logger.info(`[LW-SCRAPER] 🏠 先访问Facebook首页`);
      await this.page.goto('https://www.facebook.com', { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      // 随机延迟，模拟真实用户行为
      await this.randomDelay();
      
      // logger.info(`[LW-SCRAPER] 🌐 导航到目标页面: ${url}`);
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      // 等待页面稳定
      await this.page.waitForTimeout(2000);
      
      let result;
      if (type === 'profile') {
        result = await this.scrapeProfile();
      } else if (type === 'post') {
        result = await this.scrapePost(originalUrl || url);
      } else if (type === 'group') {
        result = await this.scrapeGroup(originalUrl || url);
      } else {
        throw new Error(`不支持的链接类型: ${type}`);
      }
      
      // 如果存在重定向，添加重定向信息
      if (originalUrl && originalUrl !== url) {
        result.originalUrl = originalUrl;
        result.redirectUrl = url;
        result.redirected = true;
      }
      
      const totalTime = Date.now() - startTime;
      // logger.info(`[LW-SCRAPER] ✅ 浏览器抓取完成: ${url}, 耗时: ${totalTime}ms`);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`[LW-SCRAPER] ❌ 浏览器抓取失败: ${url}, 耗时: ${totalTime}ms`, error);
      throw error;
    } finally {
      // 保持浏览器开启以供复用
    }
  }

  /**
   * 快速提取UID（无需启动浏览器）
   */
  tryFastExtract(url, type, extractMethod='fast_url_extract') {
    try {
      if (type === 'post') {
        // 从URL提取账号UID
        const postMatch1 = url.match(/facebook\.com\/(\d{6,})\/posts/);
        if (postMatch1) {
          const uid = postMatch1[1];
          return {
            uid,
            type: 'post',
            originalUrl: url,
            extractMethod: extractMethod,
          };
        }
        let postMatch2 = url.match(/[?&]id=(\d{6,})/);
        if (postMatch2) {
          const uid = postMatch2[1];
          return {
            uid,
            type: 'post',
            originalUrl: url,
            extractMethod: extractMethod,
          };
        }
      }
      
      if (type === 'group') {
        // 从URL提取群组ID - 支持数字ID和字母ID
        const groupMatch = url.match(/\/groups\/(\d{6,}|[a-zA-Z][a-zA-Z0-9_.-]{2,})\//);
        if (groupMatch) {
          const groupId = groupMatch[1];
          return {
            groupId: groupId,
            type: 'group',
            originalUrl: url,
            extractMethod: extractMethod
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 抓取个人资料
   */
  async scrapeProfile() {
    try {
      // 获取UID
      const content = await this.page.content();
      const uidMatch = content.match(/"userID":"(\d+)"/);
      const uid = uidMatch ? uidMatch[1] : null;

      // 获取昵称
      let nickname = null;
      try {
        const nameElement = await this.page.$('h1:first-of-type');
        if (nameElement) {
          nickname = await nameElement.textContent();
        }
      } catch (error) {
        // 忽略获取昵称失败
      }

      // 抓取粉丝数量和好友数量
      let followersCount = null;
      let friendsCount = null;
      let followersCountRaw = null;  // 原始显示文本
      let friendsCountRaw = null;    // 原始显示文本

      try {
        // 方法1: 通过页面中的链接文本查找数量
        const links = await this.page.$$('a[href*="followers"], a[href*="friends"]');
        
        for (const link of links) {
          try {
            const linkText = await link.textContent();
            const href = await link.getAttribute('href');
            
                         // 提取数字（支持千万缩写如5.4K, 1.2M）
             const numberMatch = linkText.match(/([\d,]+(?:\.\d+)?[KkMm]?)/);
             if (numberMatch) {
               let rawNumber = numberMatch[1];
               let parsedNumber = this.parseNumber(rawNumber);
               
               // 根据href判断是粉丝还是好友
               if (href && href.includes('followers') && followersCount === null) {
                 followersCount = parsedNumber;
                 followersCountRaw = rawNumber;
               } else if (href && href.includes('friends') && friendsCount === null) {
                 friendsCount = parsedNumber;
                 friendsCountRaw = rawNumber;
               }
             }
          } catch (error) {
            // 忽略单个链接的错误
          }
        }

        // 方法2: 通过通用的数字文本模式查找
        if (followersCount === null || friendsCount === null) {
          // 查找所有包含数字的元素
          const elements = await this.page.$$('span, div, a');
          
          for (const element of elements) {
            try {
              const text = await element.textContent();
              const trimmedText = text?.trim();
              
                             // 匹配纯数字（如 5466, 1,234, 5.4K, 1.2M）
               if (trimmedText && /^[\d,]+(?:\.\d+)?[KkMm]?$/.test(trimmedText)) {
                 const rawNumber = trimmedText;
                 const parsedNumber = this.parseNumber(rawNumber);
                 
                 // 根据上下文判断类型
                 const parent = await element.evaluate(el => el.parentElement?.textContent || '');
                 const context = (parent + ' ' + rawNumber).toLowerCase();
                 
                 // 如果数字在合理范围内（100-100M）且还没有获取到对应数据
                 if (parsedNumber >= 100 && parsedNumber <= 100000000) {
                   if (followersCount === null && parsedNumber > 1000) {
                     followersCount = parsedNumber;
                     followersCountRaw = rawNumber;
                   } else if (friendsCount === null && parsedNumber <= 5000) {
                     friendsCount = parsedNumber;
                     friendsCountRaw = rawNumber;
                   }
                 }
               }
            } catch (error) {
              // 忽略单个元素的错误
            }
          }
        }

        // 方法3: 从页面源码中查找JSON数据
        if (followersCount === null || friendsCount === null) {
          const jsonMatches = content.match(/"subscriber_count":(\d+)|"friend_count":(\d+)/g);
          if (jsonMatches) {
                         for (const match of jsonMatches) {
               if (match.includes('subscriber_count') && followersCount === null) {
                 const countMatch = match.match(/(\d+)/);
                 if (countMatch) {
                   const rawNumber = countMatch[1];
                   followersCount = parseInt(rawNumber);
                   followersCountRaw = rawNumber;
                 }
               }
               if (match.includes('friend_count') && friendsCount === null) {
                 const countMatch = match.match(/(\d+)/);
                 if (countMatch) {
                   const rawNumber = countMatch[1];
                   friendsCount = parseInt(rawNumber);
                   friendsCountRaw = rawNumber;
                 }
               }
             }
          }
        }

      } catch (error) {
        // 忽略数量抓取失败，不影响主要功能
      }

      return {
        uid,
        nickname: nickname?.trim() || null,
        followersCount: followersCount,
        friendsCount: friendsCount,
        followersCountRaw: followersCountRaw,  // Facebook页面显示的原始粉丝数
        friendsCountRaw: friendsCountRaw,      // Facebook页面显示的原始好友数
        type: 'profile',
        extractMethod: 'page_content'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 解析数字字符串，支持K/M缩写
   * @param {string} numberStr - 数字字符串 (如 "5.4K", "1.2M", "1,234")
   * @returns {number} 解析后的数字
   */
  parseNumber(numberStr) {
    if (!numberStr) return 0;
    
    // 移除逗号
    let cleanStr = numberStr.replace(/,/g, '');
    
    // 处理K/M缩写
    if (cleanStr.toLowerCase().includes('k')) {
      return Math.round(parseFloat(cleanStr) * 1000);
    } else if (cleanStr.toLowerCase().includes('m')) {
      return Math.round(parseFloat(cleanStr) * 1000000);
    } else {
      return parseInt(cleanStr) || 0;
    }
  }

  /**
   * 抓取帖子
   * @param {string} originalUrl - 原始URL
   * @returns {Object} 抓取结果
   */
  async scrapePost(originalUrl) {
    try {
      // 获取当前页面URL
      const currentUrl = this.page.url();
      
      const metaElements = await this.page.$$eval('meta[property^="og:"]', metas => 
        metas.map(meta => ({ property: meta.getAttribute('property'), content: meta.getAttribute('content') }))
      );
      
      for (const meta of metaElements) {
        if (meta.property === 'og:url' && meta.content) {
          const metaUidMatch = meta.content.match(/[?&]id=(\d{15,})/);
          if (metaUidMatch) {
            return {
              uid: metaUidMatch[1],
              type: 'post',
              originalUrl: originalUrl,
              redirectUrl: currentUrl,
              extractMethod: 'page_content'
            };
          }
        }
      }

      throw new Error('无法提取账号UID');
    } catch (error) {
      throw error;
    }
  }

  /**
   * 抓取群组
   */
  async scrapeGroup(originalUrl) {
    throw new Error('无法提取Group ID');
  }

  /**
   * 获取重定向跟踪器统计信息
   * @returns {Object} 重定向跟踪器统计信息
   */
  getRedirectTrackerStats() {
    return this.redirectTracker.getStats();
  }
}

class FacebookScraperPlaywrightPoolService {
  constructor(options = {}) {
    this.maxInstances = options.maxInstances || 8; // 提高到8个实例
    this.instanceTimeout = options.instanceTimeout || 180000; // 减少到3分钟
    this.cleanupInterval = options.cleanupInterval || 30000; // 30秒清理一次
    this.maxQueueSize = options.maxQueueSize || 50;
    
    this.instances = new Map();
    this.instanceQueue = [];
    this.stats = {
      created: 0,
      destroyed: 0,
      active: 0,
      queued: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      queueTimeouts: 0
    };
    
    // 初始化重定向跟踪器（用于池级别的重定向跟踪）
    this.redirectTracker = new FacebookRedirectTrackerService();
    
    this.startCleanupTimer();
    
    // logger.info(`[FB-PW-POOL] 🚀 初始化轻量化抓取服务池`);
    // logger.info(`[FB-PW-POOL] 📊 配置 - 最大实例: ${this.maxInstances}, 超时: ${this.instanceTimeout}ms`);
  }

  /**
   * 获取可用的抓取实例
   * @returns {Promise<Object>} 抓取实例包装对象
   */
  async acquireInstance() {
    const instanceId = this.generateInstanceId();
    
    // 检查队列是否已满
    if (this.instanceQueue.length >= this.maxQueueSize) {
      throw new Error(`等待队列已满 (${this.maxQueueSize})，请稍后重试`);
    }
    
    // logger.info(`[FB-PW-POOL] 📞 请求实例: ${instanceId}, 当前活跃: ${this.instances.size}, 队列: ${this.instanceQueue.length}`);
    
    // 检查是否达到最大实例数
    if (this.instances.size >= this.maxInstances) {
      return await this.waitForAvailableInstance(instanceId);
    }
    
    // 创建新实例
    return await this.createInstance(instanceId);
  }

  /**
   * 释放抓取实例
   * @param {string} instanceId - 实例ID
   */
  async releaseInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      // logger.warn(`[FB-PW-POOL] ⚠️ 尝试释放不存在的实例: ${instanceId}`);
      return;
    }
    
    // logger.info(`[FB-PW-POOL] 🔄 释放实例: ${instanceId}`);
    
    try {
      await instance.service.closeBrowser();
    } catch (error) {
      // logger.warn(`[FB-PW-POOL] ⚠️ 关闭实例浏览器失败: ${instanceId}`, error.message);
    }
    
    this.instances.delete(instanceId);
    this.stats.active = this.instances.size;
    this.stats.destroyed++;
    
    // 处理等待队列
    if (this.instanceQueue.length > 0) {
      const waitingRequest = this.instanceQueue.shift();
      this.stats.queued = this.instanceQueue.length;
      
      // logger.info(`[FB-PW-POOL] 🎯 处理等待队列，为 ${waitingRequest.instanceId} 创建实例`);
      
      try {
        const newInstance = await this.createInstance(waitingRequest.instanceId);
        waitingRequest.resolve(newInstance);
      } catch (error) {
        logger.error(`[FB-PW-POOL] ❌ 为等待请求创建实例失败: ${waitingRequest.instanceId}`, error);
        waitingRequest.reject(error);
      }
    }
  }

  /**
   * 创建新的抓取实例
   * @param {string} instanceId - 实例ID
   * @returns {Promise<Object>} 包装的实例对象
   */
  async createInstance(instanceId) {
    try {
      // logger.info(`[FB-PW-POOL] 🏗️ 创建新实例: ${instanceId}`);
      
      const service = new LightweightScraperService();
      const instance = {
        id: instanceId,
        service: service,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        requestCount: 0
      };
      
      this.instances.set(instanceId, instance);
      this.stats.created++;
      this.stats.active = this.instances.size;
      
      // logger.info(`[FB-PW-POOL] ✅ 实例创建成功: ${instanceId}, 当前活跃: ${this.instances.size}`);
      
      return {
        instanceId,
        service,
        release: () => this.releaseInstance(instanceId),
        updateLastUsed: () => {
          const inst = this.instances.get(instanceId);
          if (inst) {
            inst.lastUsed = Date.now();
            inst.requestCount++;
          }
        },
        getInfo: () => {
          const inst = this.instances.get(instanceId);
          return inst ? {
            id: inst.id,
            createdAt: inst.createdAt,
            lastUsed: inst.lastUsed,
            requestCount: inst.requestCount,
            age: Date.now() - inst.createdAt
          } : null;
        }
      };
      
    } catch (error) {
      logger.error(`[FB-PW-POOL] ❌ 创建实例失败: ${instanceId}`, error);
      throw error;
    }
  }

  /**
   * 等待可用实例
   * @param {string} instanceId - 实例ID
   * @returns {Promise<Object>} 包装的实例对象
   */
  async waitForAvailableInstance(instanceId) {
    return new Promise((resolve, reject) => {
      // logger.info(`[FB-PW-POOL] ⏳ 实例池已满，加入等待队列: ${instanceId}`);
      
      const timeout = setTimeout(() => {
        // 从队列中移除
        const index = this.instanceQueue.findIndex(req => req.instanceId === instanceId);
        if (index !== -1) {
          this.instanceQueue.splice(index, 1);
          this.stats.queued = this.instanceQueue.length;
          this.stats.queueTimeouts++;
        }
        
        // logger.warn(`[FB-PW-POOL] ⏰ 等待实例超时: ${instanceId}`);
        reject(new Error(`等待实例超时: ${instanceId} (${this.instanceTimeout}ms)`));
      }, this.instanceTimeout);
      
      this.instanceQueue.push({
        instanceId,
        createdAt: Date.now(),
        resolve: (instance) => {
          clearTimeout(timeout);
          // logger.info(`[FB-PW-POOL] 🎉 等待队列请求获得实例: ${instanceId}`);
          resolve(instance);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      this.stats.queued = this.instanceQueue.length;
    });
  }

  /**
   * 生成唯一实例ID
   * @returns {string} 实例ID
   */
  generateInstanceId() {
    return `fb-pw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupStaleInstances();
    }, this.cleanupInterval);
    
    // logger.info(`[FB-PW-POOL] 🧹 启动清理定时器，间隔: ${this.cleanupInterval}ms`);
  }

  /**
   * 清理过期实例
   */
  async cleanupStaleInstances() {
    const now = Date.now();
    const staleInstances = [];
    
    for (const [instanceId, instance] of this.instances.entries()) {
      const age = now - instance.lastUsed;
      if (age > this.instanceTimeout) {
        staleInstances.push(instanceId);
      }
    }
    
    if (staleInstances.length > 0) {
      // logger.info(`[FB-PW-POOL] 🧹 清理 ${staleInstances.length} 个过期实例`);
      
      for (const instanceId of staleInstances) {
        await this.releaseInstance(instanceId);
      }
    }
    
    // 清理过期的队列请求
    const expiredQueueRequests = [];
    for (let i = 0; i < this.instanceQueue.length; i++) {
      const request = this.instanceQueue[i];
      const waitTime = now - request.createdAt;
      if (waitTime > this.instanceTimeout) {
        expiredQueueRequests.push(i);
      }
    }
    
    if (expiredQueueRequests.length > 0) {
      // logger.info(`[FB-PW-POOL] 🧹 清理 ${expiredQueueRequests.length} 个过期队列请求`);
      
      // 从后往前删除，避免索引变化
      for (let i = expiredQueueRequests.length - 1; i >= 0; i--) {
        const index = expiredQueueRequests[i];
        const request = this.instanceQueue[index];
        request.reject(new Error(`队列等待超时: ${request.instanceId}`));
        this.instanceQueue.splice(index, 1);
        this.stats.queueTimeouts++;
      }
      
      this.stats.queued = this.instanceQueue.length;
    }
  }

  /**
   * 获取池统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const instanceDetails = Array.from(this.instances.values()).map(inst => ({
      id: inst.id,
      age: Date.now() - inst.createdAt,
      idleTime: Date.now() - inst.lastUsed,
      requestCount: inst.requestCount
    }));
    
    const queueDetails = this.instanceQueue.map(req => ({
      id: req.instanceId,
      waitTime: Date.now() - req.createdAt
    }));
    
    return {
      ...this.stats,
      active: this.instances.size,
      queued: this.instanceQueue.length,
      maxInstances: this.maxInstances,
      maxQueueSize: this.maxQueueSize,
      instanceDetails,
      queueDetails,
      health: {
        poolUtilization: (this.instances.size / this.maxInstances * 100).toFixed(1) + '%',
        queueUtilization: (this.instanceQueue.length / this.maxQueueSize * 100).toFixed(1) + '%',
        avgInstanceAge: instanceDetails.length > 0 ? 
          (instanceDetails.reduce((sum, inst) => sum + inst.age, 0) / instanceDetails.length / 1000).toFixed(1) + 's' : '0s'
      }
    };
  }

  /**
   * 关闭服务池
   */
  async shutdown() {
    logger.info('[FB-PW-POOL] 🛑 开始关闭服务池...');
    
    // 停止清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // 拒绝所有等待中的请求
    // logger.info(`[FB-PW-POOL] 📤 拒绝 ${this.instanceQueue.length} 个等待中的请求`);
    while (this.instanceQueue.length > 0) {
      const request = this.instanceQueue.shift();
      request.reject(new Error('服务池正在关闭'));
    }
    
    // 关闭所有活跃实例
    const instances = Array.from(this.instances.keys());
    // logger.info(`[FB-PW-POOL] 🔄 关闭 ${instances.length} 个活跃实例`);
    
    for (const instanceId of instances) {
      await this.releaseInstance(instanceId);
    }
    
    logger.info('[FB-PW-POOL] ✅ 服务池已关闭');
  }

  /**
   * 高级抓取方法 - 自动管理实例生命周期
   * @param {string} url - Facebook 链接
   * @param {string} type - 数据类型
   * @param {Object} options - 抓取选项
   * @returns {Object} 抓取结果
   */
  async scrapeData(url, type, options = {}) {
    let instance = null;
    const startTime = Date.now();
    
    this.stats.totalRequests++;
    
    try {
      // 获取实例
      // logger.info(`[FB-PW-POOL] 🎯 开始抓取: ${url}, 类型: ${type}`);
      instance = await this.acquireInstance();
      
      const acquireTime = Date.now() - startTime;
      // logger.info(`[FB-PW-POOL] 🎪 获取实例耗时: ${acquireTime}ms, 实例: ${instance.instanceId}`);
      
      // 更新使用时间
      instance.updateLastUsed();
      
      // 执行抓取
      const serviceResult = await instance.service.scrapeData(url, type, options);
      
      const totalTime = Date.now() - startTime;
      
      if (serviceResult.success) {
        this.stats.successfulRequests++;
        // logger.info(`[FB-PW-POOL] ✅ 抓取完成: ${url}, 总耗时: ${totalTime}ms, 实例: ${instance.instanceId}`);
        
        // 记录抓取成功日志
        const logData = {
          ...serviceResult.data,
          acquireTime: acquireTime,
          totalTime: totalTime
        };
        // scrapeSuccessLogger.info(`${JSON.stringify(logData)}`);
        
        return {
          success: true,
          data: serviceResult.data,
          poolStats: {
            instanceId: instance.instanceId,
            acquireTime: acquireTime,
            totalTime: totalTime
          }
        };
      } else {
        this.stats.failedRequests++;
        logger.error(`[FB-PW-POOL] ❌ 抓取失败: ${url}, 耗时: ${totalTime}ms, 错误: ${serviceResult.error.message}`);
        
        // 记录抓取失败日志
        scrapeFailureLogger.info(`${JSON.stringify({
          type: type,
          originalUrl: url,
          error: serviceResult.error,
          acquireTime: acquireTime,
          totalTime: totalTime,
        })}`);
        
        return {
          success: false,
          error: serviceResult.error,
          poolStats: {
            instanceId: instance.instanceId,
            acquireTime: acquireTime,
            totalTime: totalTime
          }
        };
      }
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`[FB-PW-POOL] ❌ 池级别错误: ${url}, 耗时: ${totalTime}ms`, error);
      
      this.stats.failedRequests++;
      
      // 记录池级别错误日志
      scrapeFailureLogger.info(`${JSON.stringify({
        type: type,
        originalUrl: url,
        error: {
          code: 'POOL_ERROR',
          message: error.message
        },
        totalTime: totalTime,
      })}`);
      
      return {
        success: false,
        error: {
          code: 'POOL_ERROR',
          message: error.message
        },
        poolStats: {
          instanceId: instance ? instance.instanceId : 'N/A',
          acquireTime: instance ? Date.now() - startTime : 0,
          totalTime: totalTime
        }
      };
    } finally {
      // 确保释放实例
      if (instance) {
        await instance.release();
      }
    }
  }

  /**
   * 识别链接类型
   */
  identifyLinkType(url) {
    if (url.includes('/groups/')) {
      return 'group';
    }
    if (url.includes('/posts/') || url.includes('story_fbid=') || url.includes('permalink.php')) {
      return 'post';
    }
    return 'profile';
  }
}

module.exports = FacebookScraperPlaywrightPoolService; 