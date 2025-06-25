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
      
      // 创建隐身上下文以增强隐私性
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: [],
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      // 添加反检测脚本
      await this.context.addInitScript(() => {
        // 删除 webdriver 属性
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // 修改 plugins 长度
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // 修改语言属性
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });

        // 删除自动化相关属性
        delete navigator.__proto__.webdriver;
        
        // 覆盖 permissions API
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // 修改 chrome 对象
        window.chrome = {
          runtime: {},
        };
      });

      // 创建页面
      this.page = await this.context.newPage();
      
      // 设置超时
      this.page.setDefaultNavigationTimeout(60000);
      this.page.setDefaultTimeout(30000);

      // 阻止不必要的资源加载以提高速度
      await this.page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'font', 'media', 'stylesheet'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

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
   * 安全的页面操作包装器
   */
  async safePageOperation(operation, operationName) {
    if (this.isClosing || !this.page || this.page.isClosed()) {
      logger.warn(`跳过操作 ${operationName}：浏览器正在关闭或已关闭`);
      return null;
    }

    this.incrementOperation();
    try {
      return await operation();
    } catch (error) {
      logger.error(`${operationName}失败:`, error.message);
      throw error;
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
      if (pathname.includes('/posts/') || 
          pathname.includes('/share/') || 
          searchParams.has('story_fbid') ||
          pathname.includes('/photo') ||
          pathname.includes('/video')) {
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
    const { timeout = 60000, retries = 3 } = options;
    
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
        
        await this.initBrowser({ headless: options.headless !== false });
        
        // 设置页面超时
        this.page.setDefaultTimeout(timeout);
        this.page.setDefaultNavigationTimeout(timeout);
        
        // 访问页面，使用更宽松的等待条件
        logger.info('正在访问页面...');
        try {
          await this.page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: timeout 
          });
        } catch (gotoError) {
          logger.warn('页面加载失败，尝试使用networkidle策略:', gotoError.message);
          try {
            await this.page.goto(url, { 
              waitUntil: 'networkidle',
              timeout: timeout 
            });
          } catch (secondGotoError) {
            logger.error('页面加载完全失败:', secondGotoError.message);
            throw new Error(`页面加载失败: ${secondGotoError.message}`);
          }
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
          throw new Error('页面需要登录，无法抓取数据');
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