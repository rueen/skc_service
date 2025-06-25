/**
 * Facebook 数据抓取服务 (Playwright)
 * 基于 Playwright 实现的 Facebook 数据抓取功能
 * 相比 Puppeteer 具有更强的反检测能力和稳定性
 */
const { chromium } = require('playwright');
const { logger, scrapeFailureLogger, scrapeSuccessLogger } = require('../config/logger.config');

class FacebookScraperPlaywrightService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isClosing = false;  // 添加关闭状态标志
    this.operationCount = 0; // 添加操作计数器
    
    // 记录环境信息
    logger.info(`运行环境: ${process.platform} ${process.arch}`);
    logger.info(`Node.js版本: ${process.version}`);
    logger.info(`工作目录: ${process.cwd()}`);
    
    // 检查浏览器可执行文件
    this.checkBrowsers();
  }

  /**
   * 检查可用的浏览器
   */
  async checkBrowsers() {
    if (process.platform === 'linux') {
      const fs = require('fs');
      const chromiumPaths = ['/snap/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
      
      for (const path of chromiumPaths) {
        if (fs.existsSync(path)) {
          logger.info(`检测到系统Chromium: ${path}`);
          break;
        }
      }
    }
  }

  /**
   * 初始化浏览器
   * @param {Object} options - 浏览器配置选项
   */
  async initBrowser(options = {}) {
    const defaultOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-background-networking',
        '--no-first-run',
        '--no-default-browser-check',
        '--force-color-profile=srgb'
      ]
    };

    // Linux 环境特殊配置
    if (process.platform === 'linux') {
      const fs = require('fs');
      const chromiumPaths = ['/snap/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
      
      for (const path of chromiumPaths) {
        if (fs.existsSync(path)) {
          defaultOptions.executablePath = path;
          logger.info(`使用系统Chromium: ${path}`);
          break;
        }
      }
      
      // Linux 服务器额外参数
      defaultOptions.args.push(
        '--single-process',
        '--disable-gpu',
        '--disable-software-rasterizer'
      );
    }

    try {
      // 启动浏览器
      this.browser = await chromium.launch({ ...defaultOptions, ...options });
      
      // 随机化用户代理和指纹信息，增强隐蔽性
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
      ];
      
      const viewports = [
        { width: 1366, height: 768 },
        { width: 1920, height: 1080 },
        { width: 1536, height: 864 },
        { width: 1440, height: 900 }
      ];
      
      const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
      const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
      
      // 创建隐身上下文以增强隐私性和反检测能力
      this.context = await this.browser.newContext({
        viewport: randomViewport,
        userAgent: randomUA,
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation', 'notifications'], // 更多权限模拟
        geolocation: { latitude: 40.7128, longitude: -74.0060 }, // 纽约坐标
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7', // 更真实的语言偏好
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Sec-Ch-Ua': randomUA.includes('Chrome') ? '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"' : '"Not_A Brand";v="8", "Chromium";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Ch-Ua-Platform-Version': '"15.0.0"',
          'Sec-Ch-Ua-Arch': '"x86"',
          'Sec-Ch-Ua-Bitness': '"64"',
          'Sec-Ch-Ua-Model': '""',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          'Connection': 'keep-alive',
          'Cache-Control': 'max-age=0'
        },
        // 启用 JavaScript
        javaScriptEnabled: true,
        // 设置屏幕信息
        screen: {
          width: randomViewport.width,
          height: randomViewport.height
        },
        // 启用设备像素比
        deviceScaleFactor: 1,
        // 启用更多媒体功能
        hasTouch: false,
        isMobile: false
      });

      // 添加强化的反检测脚本
      await this.context.addInitScript(() => {
        // 完全删除和覆盖 webdriver 相关属性
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
          configurable: true
        });
        
        // 删除所有可能的自动化痕迹
        delete navigator.__proto__.webdriver;
        delete window.navigator.webdriver;
        delete Object.getPrototypeOf(navigator).webdriver;

        // 模拟真实的插件列表
        Object.defineProperty(navigator, 'plugins', {
          get: () => ({
            length: 5,
            0: { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            1: { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            2: { name: 'Native Client', filename: 'internal-nacl-plugin' },
            3: { name: 'WebKit built-in PDF', filename: 'WebKit built-in PDF' },
            4: { name: 'Microsoft Edge PDF Viewer', filename: 'edge-pdf-viewer' }
          }),
          configurable: true
        });

        // 设置语言属性
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en', 'zh-CN', 'zh'],
          configurable: true
        });

        // 设置平台信息
        Object.defineProperty(navigator, 'platform', {
          get: () => 'Win32',
          configurable: true
        });

        // 模拟硬件并发
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8,
          configurable: true
        });

        // 模拟设备内存
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8,
          configurable: true
        });

        // 模拟更多真实的navigator属性
        Object.defineProperty(navigator, 'maxTouchPoints', {
          get: () => 0,
          configurable: true
        });

        Object.defineProperty(navigator, 'cookieEnabled', {
          get: () => true,
          configurable: true
        });

        Object.defineProperty(navigator, 'doNotTrack', {
          get: () => null,
          configurable: true
        });

        // 模拟网络连接信息
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            effectiveType: '4g',
            rtt: 100,
            downlink: 10,
            saveData: false
          }),
          configurable: true
        });

        // 覆盖 chrome 检测
        if (!window.chrome) {
          window.chrome = {
            runtime: {},
            loadTimes: function() {
              return {
                commitLoadTime: Date.now() - Math.random() * 1000,
                finishDocumentLoadTime: Date.now() - Math.random() * 500,
                finishLoadTime: Date.now() - Math.random() * 200,
                firstPaintAfterLoadTime: Date.now() - Math.random() * 100,
                firstPaintTime: Date.now() - Math.random() * 50,
                navigationType: 'Other',
                wasFetchedViaSpdy: true,
                wasNpnNegotiated: true
              };
            },
            csi: function() {
              return {
                onloadT: Date.now(),
                pageT: Date.now() - Math.random() * 1000,
                tran: 15
              };
            }
          };
        }
        
        // 覆盖 permissions API
        const originalQuery = window.navigator.permissions?.query;
        if (originalQuery) {
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission || 'default' }) :
              originalQuery(parameters)
          );
        }

        // 完善 chrome 对象
        if (!window.chrome) {
          window.chrome = {};
        }
        window.chrome.runtime = {
          onConnect: undefined,
          onMessage: undefined,
          PlatformOs: {
            MAC: 'mac',
            WIN: 'win',
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            OPENBSD: 'openbsd'
          },
          PlatformArch: {
            ARM: 'arm',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          },
          PlatformNaclArch: {
            ARM: 'arm',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          }
        };

        // 模拟真实的屏幕信息
        Object.defineProperty(screen, 'availWidth', {
          get: () => 1366,
          configurable: true
        });
        Object.defineProperty(screen, 'availHeight', {
          get: () => 728,
          configurable: true
        });

        // 覆盖 Date.getTimezoneOffset 方法，模拟纽约时区
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
          return 300; // EST (UTC-5)
        };

        // 模拟电池 API
        if (navigator.getBattery) {
          navigator.getBattery = () => Promise.resolve({
            charging: Math.random() > 0.5,
            chargingTime: Math.random() > 0.5 ? 0 : Math.random() * 3600,
            dischargingTime: Math.random() * 10800 + 3600, // 1-4小时
            level: 0.5 + Math.random() * 0.5 // 50-100%
          });
        }

        // 模拟真实的Canvas指纹
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(...args) {
          const result = originalToDataURL.apply(this, args);
          // 添加微小的随机噪声
          if (result.length > 100) {
            const chars = result.split('');
            const randomIndex = Math.floor(Math.random() * (chars.length - 10)) + 10;
            chars[randomIndex] = String.fromCharCode((chars[randomIndex].charCodeAt(0) + Math.floor(Math.random() * 3)) % 256);
            return chars.join('');
          }
          return result;
        };

        // 模拟WebGL指纹随机化
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
            return 'Intel Inc.';
          }
          if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
            return 'Intel(R) HD Graphics 620';
          }
          return originalGetParameter.call(this, parameter);
        };

        // 防止iframe检测
        Object.defineProperty(window, 'top', {
          get: function() { return window; }
        });
        Object.defineProperty(window, 'parent', {
          get: function() { return window; }
        });

        // 模拟真实的鼠标和键盘事件
        let mouseX = Math.random() * window.innerWidth;
        let mouseY = Math.random() * window.innerHeight;
        
        setInterval(() => {
          mouseX += (Math.random() - 0.5) * 10;
          mouseY += (Math.random() - 0.5) * 10;
          mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
          mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
        }, 1000 + Math.random() * 2000);

        // 随机页面交互
        setTimeout(() => {
          if (Math.random() > 0.7) {
            window.scrollBy(0, Math.random() * 200 - 100);
          }
        }, 2000 + Math.random() * 3000);
      });

      // 创建页面
      this.page = await this.context.newPage();
      
      // 设置超时
      this.page.setDefaultNavigationTimeout(60000);
      this.page.setDefaultTimeout(30000);

      // 智能资源管理和Cookie设置
      await this.page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        const url = route.request().url();
        
        // 保留关键资源，阻止非必要资源
        if (['image', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else if (resourceType === 'stylesheet') {
          // 保留 Facebook 的关键CSS，但阻止其他CSS
          if (url.includes('facebook.com') || url.includes('fbcdn')) {
            route.continue();
          } else {
            route.abort();
          }
        } else {
          // 为所有请求添加真实的Referrer
          const headers = route.request().headers();
          if (!headers['referer'] && url.includes('facebook.com')) {
            headers['referer'] = 'https://www.facebook.com/';
          }
          route.continue({ headers });
        }
      });
      
      // 预设一些基础的Facebook cookies
      await this.context.addCookies([
        {
          name: 'locale',
          value: 'en_US',
          domain: '.facebook.com',
          path: '/'
        },
        {
          name: 'datr',
          value: this.generateFacebookToken('datr'),
          domain: '.facebook.com',
          path: '/',
          httpOnly: true
        },
        {
          name: '_js_datr',
          value: this.generateFacebookToken('js_datr'),
          domain: '.facebook.com',
          path: '/'
        }
      ]);

      logger.info('浏览器初始化成功 (Playwright)');
    } catch (error) {
      logger.error('浏览器初始化失败 (Playwright):', error);
      throw error;
    }
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    if (this.isClosing) {
      logger.warn('浏览器已在关闭过程中，跳过重复关闭');
      return;
    }

    this.isClosing = true;
    logger.info('开始关闭浏览器，等待操作完成...');

    // 等待所有正在进行的操作完成
    let waitCount = 0;
    while (this.operationCount > 0 && waitCount < 30) { // 最多等待3秒
      logger.debug(`等待 ${this.operationCount} 个操作完成... (${waitCount}/30)`);
      await new Promise(resolve => setTimeout(resolve, 100));
      waitCount++;
    }

    if (this.operationCount > 0) {
      logger.warn(`强制关闭浏览器，仍有 ${this.operationCount} 个操作未完成`);
    }

    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      logger.info('浏览器已关闭 (Playwright)');
    } catch (error) {
      logger.error('关闭浏览器时出错 (Playwright):', error);
    } finally {
      this.isClosing = false;
      this.operationCount = 0;
      this.page = null;
      this.context = null;
      this.browser = null;
    }
  }

  /**
   * 增加操作计数
   */
  incrementOperation() {
    this.operationCount++;
    logger.debug(`操作计数增加到: ${this.operationCount}`);
  }

  /**
   * 减少操作计数
   */
  decrementOperation() {
    this.operationCount = Math.max(0, this.operationCount - 1);
    logger.debug(`操作计数减少到: ${this.operationCount}`);
  }

  /**
   * 验证页面状态
   */
  isPageValid() {
    return !this.isClosing && 
           this.browser && 
           this.context && 
           this.page && 
           !this.page.isClosed();
  }

  /**
   * 生成类似 Facebook token 的随机字符串
   * @param {string} type - token类型
   * @returns {string} 生成的token
   */
  generateFacebookToken(type) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const lengths = {
      'datr': 24,
      'js_datr': 24,
      'default': 22
    };
    
    const length = lengths[type] || lengths.default;
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * 获取人类化的延迟时间
   * 模拟真实用户的思考和操作模式
   * @returns {number} 延迟毫秒数
   */
  getHumanLikeDelay() {
    // 基础延迟：1-3秒
    const baseDelay = 1000 + Math.random() * 2000;
    
    // 随机增加额外的"思考时间"
    const thinkingTime = Math.random() > 0.7 ? Math.random() * 2000 : 0;
    
    // 偶尔添加更长的延迟，模拟用户被其他事情分心
    const distractionTime = Math.random() > 0.9 ? Math.random() * 3000 : 0;
    
    return Math.floor(baseDelay + thinkingTime + distractionTime);
  }

  /**
   * 智能建立 Facebook Session
   * @param {number} timeout - 超时时间
   * @returns {boolean} 是否成功建立session
   */
  async establishFacebookSession(timeout) {
    const sessionUrls = [
      'https://www.facebook.com',
      'https://m.facebook.com',
      'https://www.facebook.com/public',
      'https://www.facebook.com/help',
      'https://www.facebook.com/pages/create'
    ];
    
    for (let i = 0; i < sessionUrls.length; i++) {
      const sessionUrl = sessionUrls[i];
      logger.info(`尝试session URL ${i + 1}: ${sessionUrl}`);
      
      try {
        const sessionResult = await this.safePageOperation(async () => {
          await this.page.goto(sessionUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: Math.min(timeout / 4, 15000) // 限制单次尝试时间
          });
          
          // 检查是否成功访问
          const currentUrl = this.page.url();
          const title = await this.page.title();
          
          if (!currentUrl.includes('/login/') && 
              !title.toLowerCase().includes('log in')) {
            
            // 模拟真实用户行为
            await this.page.waitForTimeout(1000 + Math.random() * 2000);
            
            // 尝试滚动
            try {
              await this.page.evaluate(() => {
                window.scrollTo(0, Math.random() * 300);
              });
            } catch (e) {
              // 忽略滚动错误
            }
            
            await this.page.waitForTimeout(1000 + Math.random() * 2000);
            
            logger.info(`Session 建立成功，URL: ${sessionUrl}`);
            return true;
          } else {
            logger.warn(`${sessionUrl} 被重定向到登录页面`);
            return false;
          }
        }, `建立 Facebook session: ${sessionUrl}`, { throwOnError: false });
        
        if (sessionResult) {
          return true;
        }
        
        // 失败时短暂等待再尝试下一个
        if (i < sessionUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        }
        
      } catch (error) {
        logger.warn(`Session URL ${sessionUrl} 访问失败: ${error.message}`);
        continue;
      }
    }
    
    logger.warn('所有 session 建立尝试都失败了');
    return false;
  }

  /**
   * 获取绕过登录的策略列表
   * @param {string} originalUrl - 原始URL
   * @returns {Array} 策略列表
   */
  getLoginBypassStrategies(originalUrl) {
    const strategies = [];
    
    try {
      const url = new URL(originalUrl);
      const pathname = url.pathname;
      const searchParams = url.searchParams;
      
      // 策略1: 添加移动版参数
      const mobileUrl = originalUrl.includes('?') ? 
        `${originalUrl}&__pc=m` : `${originalUrl}?__pc=m`;
      strategies.push({
        name: '移动版访问',
        url: mobileUrl
      });
      
      // 策略2: 使用 mbasic.facebook.com
      const mbasicUrl = originalUrl.replace('www.facebook.com', 'm.facebook.com');
      strategies.push({
        name: '移动基础版',
        url: mbasicUrl
      });
      
      // 策略3: 添加 ref 参数
      const refUrl = originalUrl.includes('?') ? 
        `${originalUrl}&ref=page_internal&__tn__=*s` : 
        `${originalUrl}?ref=page_internal&__tn__=*s`;
      strategies.push({
        name: '内部引用',
        url: refUrl
      });
      
      // 策略4: 添加 v=info 参数
      const infoUrl = originalUrl.includes('?') ? 
        `${originalUrl}&v=info` : `${originalUrl}?v=info`;
      strategies.push({
        name: '信息模式',
        url: infoUrl
      });
      
      // 策略5: 移除所有参数，只保留基础路径
      const cleanUrl = `${url.protocol}//${url.host}${pathname}`;
      if (cleanUrl !== originalUrl) {
        strategies.push({
          name: '清理参数',
          url: cleanUrl
        });
      }
      
      // 策略6: 添加老版本参数
      const legacyUrl = originalUrl.includes('?') ? 
        `${originalUrl}&v=timeline` : `${originalUrl}?v=timeline`;
      strategies.push({
        name: '时间线模式',
        url: legacyUrl
      });
      
      // 策略7: 使用 touch.facebook.com
      const touchUrl = originalUrl.replace('www.facebook.com', 'touch.facebook.com');
      strategies.push({
        name: '触屏版',
        url: touchUrl
      });
      
      // 策略8: 添加社交插件参数
      const pluginUrl = originalUrl.includes('?') ? 
        `${originalUrl}&sk=about&section=contact-info` : 
        `${originalUrl}?sk=about&section=contact-info`;
      strategies.push({
        name: '关于页面',
        url: pluginUrl
      });
      
    } catch (error) {
      logger.warn('生成绕过策略时出错:', error.message);
      // 至少提供一个基本策略
      strategies.push({
        name: '基本重试',
        url: originalUrl
      });
    }
    
    return strategies;
  }

  /**
   * 安全的页面操作包装器
   */
  async safePageOperation(operation, operationName, options = {}) {
    const { throwOnError = true } = options;
    
    if (!this.isPageValid()) {
      logger.warn(`跳过操作 ${operationName}：浏览器正在关闭或已关闭`);
      return null;
    }

    this.incrementOperation();
    try {
      // 在操作前再次检查状态
      if (!this.isPageValid()) {
        logger.warn(`操作 ${operationName} 被中断：页面状态无效`);
        return null;
      }
      
      return await operation();
    } catch (error) {
      // 检查是否是因为页面关闭导致的错误
      if (error.message.includes('Target page, context or browser has been closed') ||
          error.message.includes('Protocol error') ||
          error.message.includes('Session closed')) {
        logger.warn(`操作 ${operationName} 失败：页面已关闭`);
        return null;
      }
      
      // 网络或超时错误，根据配置决定是否抛出
      if (error.message.includes('timeout') || 
          error.message.includes('net::') ||
          error.message.includes('Navigation failed')) {
        if (throwOnError) {
          logger.error(`${operationName}失败:`, error.message);
          throw error;
        } else {
          logger.warn(`${operationName}失败但不中断流程:`, error.message);
          return null;
        }
      }
      
      logger.error(`${operationName}失败:`, error.message);
      if (throwOnError) {
        throw error;
      }
      return null;
    } finally {
      this.decrementOperation();
    }
  }

  /**
   * 模拟人类行为
   */
  async simulateHumanBehavior() {
    if (!this.page || this.page.isClosed()) return;
    
    try {
      // 随机滚动
      await this.page.evaluate(() => {
        window.scrollTo(0, Math.random() * 500);
      });
      
      // 随机等待
      await this.page.waitForTimeout(1000 + Math.random() * 2000);
      
      // 随机鼠标移动
      const viewport = this.page.viewportSize();
      if (viewport) {
        await this.page.mouse.move(
          Math.random() * viewport.width,
          Math.random() * viewport.height
        );
      }
      
      await this.page.waitForTimeout(500 + Math.random() * 1000);
    } catch (error) {
      // 忽略模拟行为的错误
    }
  }

  /**
   * 识别链接类型
   * @param {string} url - Facebook 链接
   * @returns {string} 链接类型：profile, post, group
   */
  identifyLinkType(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const searchParams = urlObj.searchParams;

      // 群组链接识别
      if (pathname.includes('/groups/')) {
        return 'group';
      }

      // 带有 mibextid 参数的分享链接通常是群组
      if (searchParams.has('mibextid')) {
        return 'group';
      }

      // 帖子链接识别
      if (pathname.includes('/posts/')) {
        return 'post';
      }

      // 默认作为个人资料链接处理
      return 'profile';
    } catch (error) {
      logger.warn('URL解析失败，默认作为个人资料处理:', error.message);
      return 'profile';
    }
  }

  /**
   * 尝试快速从URL提取信息（无需启动浏览器）
   * @param {string} url - Facebook 链接
   * @param {string} type - 数据类型
   * @returns {Object|null} 提取到的数据或null
   */
  tryFastExtract(url, type) {
    try {
      logger.info(`尝试快速提取: ${url}, 类型: ${type}`);
      
      if (type === 'post') {
        // 帖子类型：从URL中提取UID
        const directUidMatch = url.match(/facebook\.com\/(\d{10,})\/posts/);
        if (directUidMatch) {
          const uid = directUidMatch[1];
          logger.info(`快速提取到帖子UID: ${uid}`);
          return {
            uid: uid,
            sourceUrl: url,
            extractionMethod: 'fast_url_extract'
          };
        }
      } else if (type === 'group') {
        // 群组类型：从URL中提取群组ID（要求至少10位数字，与scrapeGroup方法保持一致）
        const groupIdMatch = url.match(/\/groups\/(\d{10,})\//);
        if (groupIdMatch) {
          const groupId = groupIdMatch[1];
          logger.info(`快速提取到群组ID: ${groupId}`);
          return {
            groupId: groupId,
            shareUrl: url,
            extractionMethod: 'fast_url_extract'
          };
        }
      }
      
      logger.info(`无法快速提取，URL不匹配快速提取模式: ${url}`);
      return null;
    } catch (error) {
      logger.warn('快速提取失败:', error.message);
      return null;
    }
  }

  /**
   * 抓取 Facebook 数据
   * @param {string} url - Facebook 链接
   * @param {string} type - 数据类型
   * @param {Object} options - 抓取选项
   * @returns {Object} 抓取结果
   */
  async scrapeData(url, type, options = {}) {
    const { timeout = 60000, retries = 1 } = options;
    
    logger.info(`开始抓取 Facebook 数据 (Playwright): ${url}, 类型: ${type}`);
    
    // 性能优化：优先尝试从URL直接提取信息，避免启动浏览器
    const fastExtractResult = this.tryFastExtract(url, type);
    if (fastExtractResult) {
      logger.info(`快速提取成功，无需启动浏览器: ${url}`);
      
      scrapeSuccessLogger.info(JSON.stringify({
        url: url,
        type: type,
        data: fastExtractResult
      }));
      
      return {
        success: true,
        type,
        data: fastExtractResult,
        timestamp: new Date().toISOString()
      };
    }
    
    // 如果无法快速提取，则使用浏览器抓取
    logger.info(`无法快速提取，使用浏览器抓取: ${url}`);

    let attempt = 0;
    while (attempt < retries) {
      try {
        logger.info(`开始第 ${attempt + 1} 次抓取尝试 (Playwright): ${url}`);
        
        // 确保浏览器初始化成功
        try {
          await this.initBrowser({ headless: options.headless !== false });
          if (!this.browser || !this.page) {
            throw new Error('浏览器初始化失败');
          }
        } catch (initError) {
          logger.error('浏览器初始化失败:', initError.message);
          throw new Error(`浏览器初始化失败: ${initError.message}`);
        }
        
        // 设置页面超时
        this.page.setDefaultTimeout(timeout);
        this.page.setDefaultNavigationTimeout(timeout);
        
        // 智能 Facebook session 建立策略
        logger.info('正在建立 Facebook session...');
        const sessionSuccess = await this.establishFacebookSession(timeout);
        
        if (sessionSuccess) {
          logger.info('Facebook session 建立成功');
        } else {
          logger.warn('Session 建立失败，将直接访问目标页面');
          
          // 确保浏览器状态正常
          if (!this.isPageValid()) {
            logger.info('检测到浏览器状态异常，重新初始化...');
            await this.closeBrowser();
            await this.initBrowser({ headless: options.headless !== false });
            if (!this.isPageValid()) {
              throw new Error('浏览器重新初始化失败');
            }
            // 重新设置超时
            this.page.setDefaultTimeout(timeout);
            this.page.setDefaultNavigationTimeout(timeout);
          }
        }

        // 确保浏览器状态正常，再访问目标页面
        if (!this.isPageValid()) {
          logger.warn('浏览器状态异常，重新初始化...');
          await this.closeBrowser();
          await this.initBrowser({ headless: options.headless !== false });
          if (!this.isPageValid()) {
            throw new Error('浏览器重新初始化失败');
          }
          // 重新设置超时
          this.page.setDefaultTimeout(timeout);
          this.page.setDefaultNavigationTimeout(timeout);
        }

        // 访问目标页面，使用更真实的访问模式
        logger.info('正在访问目标页面...');
        
        // 模拟真实用户的访问延迟模式
        const humanDelay = this.getHumanLikeDelay();
        logger.info(`模拟用户思考时间: ${humanDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, humanDelay));
        
        const navigationSuccess = await this.safePageOperation(async () => {
          
          try {
            await this.page.goto(url, { 
              waitUntil: 'domcontentloaded',
              timeout: timeout 
            });
            return true;
          } catch (gotoError) {
            logger.warn('页面加载失败，尝试使用networkidle策略:', gotoError.message);
            try {
              await this.page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: Math.min(timeout, 30000) // 限制最大超时时间
              });
              return true;
            } catch (secondGotoError) {
              logger.error('页面加载完全失败:', secondGotoError.message);
              throw new Error(`页面加载失败: ${secondGotoError.message}`);
            }
          }
        }, '访问目标页面');

        if (!navigationSuccess) {
          throw new Error('页面导航失败：浏览器已关闭或超时');
        }
        
        // 等待页面基本加载完成
        logger.info('等待页面加载...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查页面是否正常加载
        const currentUrl = this.page.url();
        const pageTitle = await this.safePageOperation(
          () => this.page.title(),
          '获取页面标题'
        ) || '';
        logger.info(`页面加载完成 - URL: ${currentUrl}, 标题: ${pageTitle}`);
        
        // 检查是否被重定向到登录页面
        if (currentUrl.includes('/login/') || pageTitle.toLowerCase().includes('log in')) {
          logger.warn(`Facebook 要求登录访问: ${url}`);
          logger.warn(`重定向到: ${currentUrl}`);
          
          // 多重策略尝试绕过登录
          let alternativeSuccess = false;
          const strategies = this.getLoginBypassStrategies(url);
          
          for (let i = 0; i < strategies.length; i++) {
            const strategy = strategies[i];
            logger.info(`尝试策略 ${i + 1}: ${strategy.name}`);
            
            try {
              alternativeSuccess = await this.safePageOperation(async () => {
                // 清除可能的cookies和缓存
                await this.context.clearCookies();
                
                // 随机等待
                await this.page.waitForTimeout(1000 + Math.random() * 2000);
                
                logger.info(`访问URL: ${strategy.url}`);
                await this.page.goto(strategy.url, { 
                  waitUntil: 'domcontentloaded',
                  timeout: Math.min(timeout / 2, 15000)
                });
                
                // 等待页面稳定
                await this.page.waitForTimeout(2000);
                
                const newUrl = this.page.url();
                const newTitle = await this.page.title();
                
                logger.info(`新URL: ${newUrl}, 新标题: ${newTitle}`);
                
                // 检查是否成功绕过登录
                if (!newUrl.includes('/login/') && 
                    !newTitle.toLowerCase().includes('log in') &&
                    !newTitle.toLowerCase().includes('sign in')) {
                  logger.info(`策略 ${i + 1} 成功: ${strategy.name}`);
                  return true;
                }
                
                return false;
              }, `尝试策略: ${strategy.name}`);
              
              if (alternativeSuccess) {
                break; // 成功则退出循环
              }
              
            } catch (strategyError) {
              logger.warn(`策略 ${i + 1} 失败: ${strategyError.message}`);
              continue; // 尝试下一个策略
            }
            
            // 策略间等待
            if (i < strategies.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
            }
          }

          if (!alternativeSuccess) {
            throw new Error('所有登录绕过策略都失败，无法抓取数据');
          }
        }
        
        let result;
        switch (type) {
          case 'profile':
            result = await this.scrapeProfile();
            break;
          case 'post':
            result = await this.scrapePost(url);
            break;
          case 'group':
            result = await this.scrapeGroup(url);
            break;
          default:
            throw new Error(`不支持的数据类型: ${type}`);
        }
        
        await this.closeBrowser();
        logger.info(`抓取成功 (Playwright): ${url}`);
        
        if (result.extractionMethod === 'failed'){
          scrapeFailureLogger.info(JSON.stringify({
            url: url,
            type: type,
            data: result
          }));
        } else {
          scrapeSuccessLogger.info(JSON.stringify({
            url: url,
            type: type,
            data: result
          }));
        }
        
        return {
          success: true,
          type,
          data: result,
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        attempt++;
        logger.error(`抓取失败 (尝试 ${attempt}/${retries}) (Playwright): ${error.message}`);
        
        await this.closeBrowser();
        
        if (attempt >= retries) {
          scrapeFailureLogger.info(JSON.stringify({
            url: url,
            type: type,
            message: this.getErrorMessage(error),
            details: error.message
          }));
          
          return {
            success: false,
            error: {
              code: this.getErrorCode(error),
              message: this.getErrorMessage(error),
              details: error.message
            },
            timestamp: new Date().toISOString()
          };
        }
        
        // 重试前等待，递增延迟
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.info(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 获取错误代码
   */
  getErrorCode(error) {
    if (!error) return 'UNKNOWN_ERROR';
    
    const message = error.message.toLowerCase();
    if (message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (message.includes('detached')) return 'FRAME_DETACHED';
    if (message.includes('connection closed')) return 'CONNECTION_CLOSED';
    if (message.includes('navigation')) return 'NAVIGATION_ERROR';
    
    return 'SCRAPE_ERROR';
  }

  /**
   * 获取错误信息
   */
  getErrorMessage(error) {
    if (!error) return '未知错误';
    return error.message || '数据抓取失败';
  }

  /**
   * 抓取个人资料信息
   * @returns {Object} 个人资料数据
   */
  async scrapeProfile() {
    try {
      logger.info('开始抓取个人资料信息...');
      
      // 等待页面关键元素加载
      try {
        await this.page.waitForSelector('body', { timeout: 15000 });
      } catch (e) {
        logger.warn('等待body元素超时，继续尝试抓取');
      }
      
      // 记录页面基本信息用于调试
      const currentUrl = this.page.url();
      const pageTitle = await this.safePageOperation(
        () => this.page.title(),
        '获取页面标题'
      ) || '';
      logger.info(`当前页面URL: ${currentUrl}`);
      logger.info(`页面标题: ${pageTitle}`);
      
      // 检查页面是否正常加载
      const bodyContent = await this.safePageOperation(
        () => this.page.$eval('body', el => el.innerText.substring(0, 100)),
        '获取页面内容'
      ) || '';
      logger.info(`页面内容预览: ${bodyContent}...`);
      
      // 检查是否需要登录
      const isLoginRequired = bodyContent.toLowerCase().includes('log in') || 
                             bodyContent.toLowerCase().includes('login') ||
                             bodyContent.toLowerCase().includes('sign in') ||
                             currentUrl.includes('/login/');
      
      if (isLoginRequired) {
        logger.warn('页面需要登录，可能无法获取完整信息');
      }
      
      const profileData = {};
      profileData.profileUrl = currentUrl;
      
      // 尝试获取 UID
      logger.info('正在获取用户ID...');
      const uidMatch = currentUrl.match(/(?:id=|profile\.php\?id=)(\d+)/);
      if (uidMatch) {
        profileData.uid = uidMatch[1];
        logger.info(`从URL获取到UID: ${profileData.uid}`);
      } else {
        // 从页面源码中查找 UID
        const pageContent = await this.safePageOperation(
          () => this.page.content(),
          '获取页面源码'
        );
        
        if (pageContent) {
          logger.info(`页面源码长度: ${pageContent.length} 字符`);
          
          const uidPatterns = [
            /"userID":"(\d+)"/,
            /"USER_ID":"(\d+)"/,
            /user_id['"]:['"](\d+)['"]/,
            /profile_id['"]:['"](\d+)['"]/,
            /"profile_owner":"(\d+)"/,
            /"actorID":"(\d+)"/,
            /"pageID":"(\d+)"/
          ];
          
          for (const pattern of uidPatterns) {
            const match = pageContent.match(pattern);
            if (match) {
              profileData.uid = match[1];
              logger.info(`从页面内容获取到UID: ${profileData.uid} (模式: ${pattern})`);
              break;
            }
          }
          
          if (!profileData.uid) {
            logger.warn('所有UID提取模式都未匹配成功');
          }
        }
      }
      
      // 尝试获取昵称
      logger.info('正在获取用户昵称...');
      const nicknameSelectors = [
        'h1[data-testid="profile-name"]',
        '[data-testid="profile-name"]',
        'h1[data-testid="profile_name"]',
        'h1[role="heading"]',
        'h1:first-of-type',
        '.profileName',
        '#fb-timeline-cover-name',
        '.fb-timeline-cover-name',
        'h1'
      ];
      
      for (const selector of nicknameSelectors) {
        const element = await this.safePageOperation(
          () => this.page.$(selector),
          `查找昵称元素 ${selector}`
        );
        
        if (element) {
          const text = await this.safePageOperation(
            () => element.textContent(),
            `获取昵称文本 ${selector}`
          );
          
          if (text && text.trim() && !text.toLowerCase().includes('facebook')) {
            profileData.nickname = text.trim();
            logger.info(`通过选择器 ${selector} 获取到昵称: ${profileData.nickname}`);
            break;
          }
        }
      }
      
      if (!profileData.nickname) {
        // 从页面标题中提取昵称
        if (pageTitle && pageTitle !== 'Facebook' && !pageTitle.toLowerCase().includes('log in')) {
          const titleMatch = pageTitle.match(/^([^|]+)/);
          if (titleMatch) {
            profileData.nickname = titleMatch[1].trim();
            logger.info(`从页面标题获取到昵称: ${profileData.nickname}`);
          }
        }
      }
      
      logger.info('个人资料信息抓取完成');
      return profileData;
    } catch (error) {
      logger.error('抓取个人资料失败:', error);
      throw error;
    }
  }

  /**
   * 解析数字字符串，支持K、M、B后缀和国际化格式
   * @param {string} str - 数字字符串
   * @returns {number} 解析后的数字
   */
  parseNumber(str) {
    if (!str) return 0;
    
    logger.info(`解析数字字符串: "${str}"`);
    
    const cleanStr = str.replace(/[\s,']/g, '');
    logger.info(`清理后的字符串: "${cleanStr}"`);
    
    const numberMatch = cleanStr.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) {
      logger.warn(`无法从字符串中提取数字: "${str}"`);
      return 0;
    }
    
    const num = parseFloat(numberMatch[1]);
    const upperStr = cleanStr.toUpperCase();
    
    logger.info(`提取的数字: ${num}, 后缀检查字符串: "${upperStr}"`);
    
    let result;
    if (upperStr.includes('K') || upperStr.includes('千')) {
      result = Math.round(num * 1000);
      logger.info(`K后缀转换: ${num} * 1000 = ${result}`);
    } else if (upperStr.includes('M') || upperStr.includes('万')) {
      const multiplier = upperStr.includes('万') ? 10000 : 1000000;
      result = Math.round(num * multiplier);
      logger.info(`M/万后缀转换: ${num} * ${multiplier} = ${result}`);
    } else if (upperStr.includes('B') || upperStr.includes('亿')) {
      const multiplier = upperStr.includes('亿') ? 100000000 : 1000000000;
      result = Math.round(num * multiplier);
      logger.info(`B/亿后缀转换: ${num} * ${multiplier} = ${result}`);
    } else {
      result = Math.round(num);
      logger.info(`无后缀转换: ${num} = ${result}`);
    }
    
    return result;
  }

  /**
   * 抓取帖子信息（主要目的：获取UID）
   * @param {string} originalUrl - 原始请求的URL
   * @returns {Object} 帖子数据
   */
  async scrapePost(originalUrl) {
    try {
      logger.info('开始抓取帖子信息（主要获取UID）...');
      
      const postData = {};
      postData.sourceUrl = originalUrl;
      
      // 方法1: 优先从原始URL中直接提取UID（适用于格式如 /100029686899461/posts/）
      const directUidMatch = originalUrl.match(/facebook\.com\/(\d{10,})\/posts/);
      if (directUidMatch) {
        postData.uid = directUidMatch[1];
        postData.extractionMethod = 'direct_url_match';
        logger.info(`通过直接匹配从原始URL提取到UID: ${postData.uid}`);
        return postData;
      }
      
      // 如果无法从原始URL提取UID，则尝试访问页面
      logger.info('无法从原始URL直接提取UID，尝试访问页面...');
      
      await this.page.waitForSelector('body', { timeout: 10000 });
      
      // 获取当前页面URL
      const currentUrl = this.page.url();
      postData.currentUrl = currentUrl;
      
      // 方法2: 从重定向URL中提取UID（从id参数中获取）
      const uidMatch = currentUrl.match(/[?&]id=(\d{10,})/);
      if (uidMatch) {
        postData.uid = uidMatch[1];
        postData.extractionMethod = 'redirect_url_match';
        logger.info(`从重定向URL的id参数中提取到UID: ${postData.uid}`);
        return postData;
      }
      
      // 如果所有方法都失败，返回空结果
      logger.warn('无法从任何方式提取到UID');
      postData.extractionMethod = 'failed';
      
      return postData;
    } catch (error) {
      logger.error('抓取帖子信息失败:', error);
      throw error;
    }
  }

  /**
   * 抓取群组信息（主要目的：获取群ID）
   * @param {string} originalUrl - 原始请求的URL
   * @returns {Object} 群组数据
   */
  async scrapeGroup(originalUrl) {
    try {
      logger.info('开始抓取群组信息（主要获取群ID）...');
      
      const groupData = {};
      groupData.sourceUrl = originalUrl;
      
      // 方法1: 优先从原始URL中直接提取群ID（适用于格式如 /groups/3251602094950259/permalink/）
      const directGroupIdMatch = originalUrl.match(/\/groups\/(\d{10,})\//);
      if (directGroupIdMatch) {
        groupData.groupId = directGroupIdMatch[1];
        groupData.extractionMethod = 'direct_url_match';
        logger.info(`通过直接匹配从原始URL提取到群ID: ${groupData.groupId}`);
        return groupData;
      }
      
      // 如果无法从原始URL提取群ID，则尝试访问页面
      logger.info('无法从原始URL直接提取群ID，尝试访问页面...');
      
      await this.page.waitForSelector('body', { timeout: 10000 });
      
      // 获取当前页面URL
      const currentUrl = this.page.url();
      groupData.currentUrl = currentUrl;
      
      // 方法2: 从重定向URL中提取群ID（从groups路径中获取）
      const redirectGroupIdMatch = currentUrl.match(/\/groups\/(\d{10,})\//);
      if (redirectGroupIdMatch) {
        groupData.groupId = redirectGroupIdMatch[1];
        groupData.extractionMethod = 'redirect_url_match';
        logger.info(`从重定向URL的groups路径中提取到群ID: ${groupData.groupId}`);
        return groupData;
      }
      
      // 如果所有方法都失败，返回空结果
      logger.warn('无法从任何方式提取到群ID');
      groupData.extractionMethod = 'failed';
      
      return groupData;
    } catch (error) {
      logger.error('抓取群组信息失败:', error);
      throw error;
    }
  }
}

module.exports = FacebookScraperPlaywrightService; 