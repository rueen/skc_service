/*
 * @Author: diaochan
 * @Date: 2025-06-23 14:36:28
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-25 20:05:08
 * @Description: 
 */
/**
 * Facebook 数据抓取服务 (Puppeteer)
 * 基于 Puppeteer 实现的 Facebook 数据抓取功能
 */
const puppeteer = require('puppeteer');
const { logger, scrapeFailureLogger, scrapeSuccessLogger } = require('../config/logger.config');

class FacebookScraperPuppeteerService {
  constructor() {
    this.browser = null;
    this.page = null;
    
    // 记录环境信息
    logger.info(`运行环境: ${process.platform} ${process.arch}`);
    logger.info(`Node.js版本: ${process.version}`);
    logger.info(`工作目录: ${process.cwd()}`);
    
    // 检查Chrome/Chromium可执行文件
    if (process.platform === 'linux') {
      const fs = require('fs');
      if (fs.existsSync('/usr/bin/chromium-browser')) {
        try {
          const { execSync } = require('child_process');
          const chromiumVersion = execSync('/usr/bin/chromium-browser --version', { encoding: 'utf8' }).trim();
          logger.info(`系统Chromium版本: ${chromiumVersion}`);
        } catch (e) {
          logger.warn('无法获取Chromium版本信息:', e.message);
        }
      } else {
        logger.warn('未找到系统Chromium: /usr/bin/chromium-browser');
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
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };

    // 服务器环境使用系统Chromium并添加额外兼容性参数
    if (process.platform === 'linux') {
      const fs = require('fs');
      // 优先使用snap安装的chromium，其次是传统路径
      const chromiumPaths = ['/snap/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
      let chromiumPath = null;
      
      // 查找可用的chromium路径
      for (const path of chromiumPaths) {
        if (fs.existsSync(path)) {
          chromiumPath = path;
          break;
        }
      }
      
      if (!chromiumPath) {
        logger.warn('未找到任何Chromium可执行文件，将使用Puppeteer内置Chrome');
      }
      
      // 检查系统Chromium是否可用
      let useSystemChromium = false;
      if (chromiumPath) {
        try {
          const { execSync } = require('child_process');
          // 测试Chromium是否能正常启动
          execSync(`${chromiumPath} --version`, { 
            timeout: 5000,
            stdio: 'pipe' 
          });
          useSystemChromium = true;
          logger.info(`检测到可用的系统Chromium: ${chromiumPath}，将使用系统版本`);
        } catch (e) {
          logger.warn('系统Chromium不可用，将使用Puppeteer内置Chrome:', e.message);
        }
      }
      
      if (useSystemChromium) {
        defaultOptions.executablePath = chromiumPath;
        
        // 添加Linux服务器专用参数
        defaultOptions.args.push(
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--disable-background-networking',
          '--disable-background-mode',
          '--disable-client-side-phishing-detection',
          '--disable-component-extensions-with-background-pages',
          '--disable-ipc-flooding-protection',
          '--single-process',
          '--no-default-browser-check',
          '--no-first-run',
          '--force-color-profile=srgb',
          '--lang=en-US',
          '--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess',
          '--disable-software-rasterizer',
          '--disable-background-timer-throttling'
        );
        
        logger.info('配置Linux服务器环境的系统Chromium启动参数');
      } else {
        // 使用Puppeteer内置Chrome的Linux优化参数
        defaultOptions.args.push(
          '--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess',
          '--disable-software-rasterizer',
          '--single-process'
        );
        
        logger.info('使用Puppeteer内置Chrome并配置Linux优化参数');
      }
    }

    try {
      this.browser = await puppeteer.launch({ ...defaultOptions, ...options });
      this.page = await this.browser.newPage();
      
      // 设置用户代理
      await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // 设置视口
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // 设置页面超时
      this.page.setDefaultNavigationTimeout(60000);
      this.page.setDefaultTimeout(30000);
      
      // 设置额外的请求头
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });

      // 拦截不必要的资源以提高加载速度
      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const resourceType = request.resourceType();
        // 阻止图片、字体、媒体文件的加载以提高速度
        if (['image', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      logger.info('浏览器初始化成功 (Puppeteer)');
    } catch (error) {
      logger.error('浏览器初始化失败 (Puppeteer):', error);
      throw error;
    }
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    try {
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
      logger.info('浏览器已关闭 (Puppeteer)');
    } catch (error) {
      logger.error('关闭浏览器时出错 (Puppeteer):', error);
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

      // /share/p/ 格式的链接，默认为帖子（除非有群组参数）
      if (pathname.includes('/share/p/')) {
        return 'post';
      }

      // 个人资料链接识别
      if (pathname.includes('/profile.php')) {
        return 'profile';
      }

      // 其他格式的个人资料链接
      if (pathname.match(/^\/[a-zA-Z0-9._-]+\/?$/)) {
        return 'profile';
      }

      // 默认返回 profile
      return 'profile';
    } catch (error) {
      logger.error('链接类型识别失败:', error);
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
    
    logger.info(`开始抓取 Facebook 数据 (Puppeteer): ${url}, 类型: ${type}`);
    
    // 性能优化：优先尝试从URL直接提取信息，避免启动浏览器
    const fastExtractResult = this.tryFastExtract(url, type);
    if (fastExtractResult) {
      logger.info(`快速提取成功，无需启动浏览器: ${url}`);
      
      scrapeSuccessLogger.info(JSON.stringify({
        engine: 'puppeteer',
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
        logger.info(`开始第 ${attempt + 1} 次抓取尝试 (Puppeteer): ${url}`);
        
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
          logger.warn('页面加载失败，尝试使用networkidle0策略:', gotoError.message);
          try {
            await this.page.goto(url, { 
              waitUntil: 'networkidle0',
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
        const pageTitle = await this.page.title();
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
        logger.info(`抓取成功 (Puppeteer): ${url}`);
        
        if (result.extractionMethod === 'failed'){
          scrapeFailureLogger.info(JSON.stringify({
            engine: 'puppeteer',
            url: url,
            type: type,
            data: result
          }));
        } else {
          scrapeSuccessLogger.info(JSON.stringify({
            engine: 'puppeteer',
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
        logger.error(`抓取失败 (尝试 ${attempt}/${retries}) (Puppeteer): ${error.message}`);
        
        await this.closeBrowser();
        
        if (attempt >= retries) {
          scrapeFailureLogger.info(JSON.stringify({
            engine: 'puppeteer',
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
   * 根据错误类型获取错误代码
   * @param {Error} error - 错误对象
   * @returns {string} 错误代码
   */
  getErrorCode(error) {
    if (error.message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    } else if (error.message.includes('登录') || error.message.toLowerCase().includes('login')) {
      return 'LOGIN_REQUIRED';
    } else if (error.message.includes('网络') || error.message.toLowerCase().includes('network')) {
      return 'NETWORK_ERROR';
    } else {
      return 'SCRAPE_FAILED';
    }
  }

  /**
   * 根据错误类型获取用户友好的错误消息
   * @param {Error} error - 错误对象
   * @returns {string} 错误消息
   */
  getErrorMessage(error) {
    if (error.message.includes('timeout')) {
      return '请求超时，请稍后重试';
    } else if (error.message.includes('登录') || error.message.toLowerCase().includes('login')) {
      return '该内容需要登录才能访问';
    } else if (error.message.includes('网络') || error.message.toLowerCase().includes('network')) {
      return '网络连接错误';
    } else {
      return '数据抓取失败';
    }
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
      const pageTitle = await this.page.title();
      logger.info(`当前页面URL: ${currentUrl}`);
      logger.info(`页面标题: ${pageTitle}`);
      
      // 检查页面是否正常加载
      const bodyContent = await this.page.$eval('body', el => el.innerText.substring(0, 100));
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
        try {
          const pageContent = await this.page.content();
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
            // 输出部分页面内容用于调试
            const contentSample = pageContent.substring(0, 500);
            logger.info(`页面内容示例: ${contentSample}...`);
          }
        } catch (e) {
          logger.warn('从页面内容获取UID失败:', e.message);
        }
      }
      
      // 尝试获取昵称
      logger.info('正在获取用户昵称...');
      try {
        const nicknameSelectors = [
          'h1[data-testid="profile-name"]',
          '[data-testid="profile-name"]',
          'h1[data-testid="profile_name"]',
          'h1[role="heading"]',
          'h1:first-of-type',
          '.profileName',
          '#fb-timeline-cover-name',
          '.fb-timeline-cover-name',
          'h1',
          'h2[role="heading"]'
        ];
        
        for (const selector of nicknameSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const text = await this.page.evaluate(el => el.textContent, element);
              logger.info(`选择器 ${selector} 获取到文本: "${text}"`);
              
              if (text && text.trim() && 
                  !text.toLowerCase().includes('facebook') &&
                  !text.toLowerCase().includes('log in') &&
                  !text.toLowerCase().includes('login') &&
                  text.length < 100) {
                profileData.nickname = text.trim();
                logger.info(`获取到昵称: ${profileData.nickname}`);
                break;
              }
            }
          } catch (e) {
            logger.warn(`选择器 ${selector} 失败: ${e.message}`);
            continue;
          }
        }
        
        // 如果没有获取到昵称，尝试从页面标题获取
        if (!profileData.nickname && pageTitle) {
          logger.info(`尝试从页面标题获取昵称: "${pageTitle}"`);
          if (!pageTitle.toLowerCase().includes('facebook') && 
              !pageTitle.toLowerCase().includes('log in') &&
              !pageTitle.toLowerCase().includes('login') &&
              !pageTitle.toLowerCase().includes('sign in')) {
            const cleanTitle = pageTitle
              .replace(/\s*\|\s*Facebook$/i, '')
              .replace(/\s*-\s*Facebook$/i, '')
              .replace(/\s*on Facebook$/i, '')
              .trim();
            
            if (cleanTitle) {
              profileData.nickname = cleanTitle;
              logger.info(`从页面标题获取到昵称: ${profileData.nickname}`);
            }
          }
        }
      } catch (error) {
        logger.warn('获取昵称失败:', error.message);
      }
      
      // 尝试获取粉丝数和好友数
      logger.info('正在获取统计数据...');
      try {
        const statsSelectors = [
          '[data-testid="profile-followers-count"]',
          '[data-testid="followers-count"]',
          'a[href*="followers"] span',
          'a[href*="followers"]',
          '[data-testid*="count"]',
          '.profileStats a',
          '.stats a',
          'div[role="tablist"] a'
        ];
        
        // 尝试获取粉丝数
        for (const selector of statsSelectors) {
          try {
            const elements = await this.page.$$(selector);
            for (const element of elements) {
              const text = await this.page.evaluate(el => el.textContent, element);
              const href = await this.page.evaluate(el => el.href || '', element);
              
              if (href.includes('followers') || href.includes('subscriber')) {
                const numberMatch = text.match(/(\d+(?:[,.\s]\d+)*[KMB]?)/);
                if (numberMatch) {
                  profileData.followersRaw = numberMatch[1];
                  profileData.followers = this.parseNumber(numberMatch[1]);
                  logger.info(`获取到粉丝数: ${profileData.followers} (原始: ${profileData.followersRaw})`);
                  break;
                }
              }
            }
            if (profileData.followers) break;
          } catch (e) {
            continue;
          }
        }
        
        // 尝试获取好友数
        const friendsSelectors = [
          '[data-testid="profile-friends-count"]',
          '[data-testid="friends-count"]',
          'a[href*="friends"] span',
          'a[href*="friends"]',
          'div[data-testid*="friend"]'
        ];
        
        for (const selector of friendsSelectors) {
          try {
            const elements = await this.page.$$(selector);
            for (const element of elements) {
              const text = await this.page.evaluate(el => el.textContent, element);
              const href = await this.page.evaluate(el => el.href || '', element);
              
              if (href.includes('friends') || href.includes('friend')) {
                const numberMatch = text.match(/(\d+(?:[,.\s]\d+)*[KMB]?)/);
                if (numberMatch) {
                  profileData.friendsRaw = numberMatch[1];
                  profileData.friends = this.parseNumber(numberMatch[1]);
                  logger.info(`获取到好友数: ${profileData.friends} (原始: ${profileData.friendsRaw})`);
                  break;
                }
              }
            }
            if (profileData.friends) break;
          } catch (e) {
            continue;
          }
        }
        
      } catch (error) {
        logger.warn('获取统计数据失败:', error.message);
      }
      
      // 获取头像
      logger.info('正在获取头像...');
      try {
        const avatarSelectors = [
          'img[data-testid="profile-photo"]',
          'img[data-testid="profile-picture"]',
          '.profilePicThumb img',
          '.profilePic img'
        ];
        
        for (const selector of avatarSelectors) {
          try {
            const avatarElement = await this.page.$(selector);
            if (avatarElement) {
              const src = await this.page.evaluate(el => el.src, avatarElement);
              if (src && src.startsWith('http')) {
                profileData.avatarUrl = src;
                logger.info('获取到头像URL');
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (error) {
        logger.warn('获取头像失败:', error.message);
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

module.exports = FacebookScraperPuppeteerService; 