/*
 * @Author: diaochan
 * @Date: 2025-06-23 14:36:28
 * @LastEditors: diaochan
 * @LastEditTime: 2025-06-24 10:45:59
 * @Description: 
 */
/**
 * Facebook 数据抓取服务 (Puppeteer)
 * 基于 Puppeteer 实现的 Facebook 数据抓取功能
 */
const puppeteer = require('puppeteer');
const logger = require('../config/logger.config');

class FacebookScraperPuppeteerService {
  constructor() {
    this.browser = null;
    this.page = null;
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
   * 从帖子URL中提取UID（性能优化方法）
   * @param {string} url - Facebook 帖子链接
   * @returns {Object} 提取结果
   */
  extractUidFromPostUrl(url) {
    try {
      logger.info(`尝试从帖子URL直接提取UID: ${url}`);
      
      // 方法1: 直接从URL中提取UID（适用于格式如 /100029686899461/posts/）
      const directUidMatch = url.match(/facebook\.com\/(\d{10,})\/posts/);
      if (directUidMatch) {
        const uid = directUidMatch[1];
        logger.info(`成功从URL直接提取到UID: ${uid}`);
        
        return {
          success: true,
          uid: uid,
          data: {
            uid: uid,
            sourceUrl: url,
            extractionMethod: 'direct_url_match'
          }
        };
      }
      
      logger.info('URL格式不匹配直接提取模式，需要浏览器抓取');
      return {
        success: false,
        reason: 'url_format_not_supported'
      };
      
    } catch (error) {
      logger.warn('从URL提取UID失败:', error.message);
      return {
        success: false,
        reason: 'extraction_error',
        error: error.message
      };
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
   * 抓取 Facebook 数据
   * @param {string} url - Facebook 链接
   * @param {string} type - 数据类型
   * @param {Object} options - 抓取选项
   * @returns {Object} 抓取结果
   */
  async scrapeData(url, type, options = {}) {
    const { timeout = 60000, retries = 3 } = options;
    
    // 性能优化：如果是帖子类型且可以直接从URL提取UID，则跳过浏览器抓取
    if (type === 'post') {
      const urlUidResult = this.extractUidFromPostUrl(url);
      if (urlUidResult.success) {
        logger.info(`性能优化：直接从URL提取到UID，跳过浏览器抓取: ${urlUidResult.uid}`);
        return {
          success: true,
          type,
          data: urlUidResult.data,
          timestamp: new Date().toISOString()
        };
      }
    }
    
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
        await this.page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: timeout 
        });
        
        // 等待页面基本加载完成
        logger.info('等待页面加载...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 检查是否遇到登录页面或验证页面
        const isLoginPage = await this.checkLoginPage();
        if (isLoginPage) {
          throw new Error('页面需要登录才能访问');
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
            result = await this.scrapeGroup();
            break;
          default:
            throw new Error(`不支持的数据类型: ${type}`);
        }
        
        await this.closeBrowser();
        logger.info(`抓取成功 (Puppeteer): ${url}`);
        
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
   * 检查是否为登录页面
   * @returns {boolean} 是否为登录页面
   */
  async checkLoginPage() {
    try {
      const currentUrl = this.page.url();
      logger.info(`开始检查登录页面，当前URL: ${currentUrl}`);
      
      // 首先检查URL是否包含登录相关路径
      const loginUrlPatterns = [
        '/login',
        '/signin',
        '/auth',
        'login.php'
      ];
      
      const hasLoginUrl = loginUrlPatterns.some(pattern => 
        currentUrl.toLowerCase().includes(pattern)
      );
      
      if (hasLoginUrl) {
        logger.info('检测到登录页面：URL包含登录路径');
        return true;
      }
      
      // 检查页面标题
      const pageTitle = await this.page.title();
      logger.info(`页面标题: ${pageTitle}`);
      
      const strictLoginTitleKeywords = ['log into facebook', 'facebook - log in', 'sign in to facebook'];
      const hasStrictLoginTitle = strictLoginTitleKeywords.some(keyword => 
        pageTitle.toLowerCase().includes(keyword)
      );
      
      if (hasStrictLoginTitle) {
        logger.info('检测到登录页面：页面标题包含登录关键词');
        return true;
      }
      
      // 检查是否存在特定的登录表单组合
      const hasEmailInput = await this.page.$('input[name="email"]');
      const hasPasswordInput = await this.page.$('input[name="pass"]');
      const hasLoginButton = await this.page.$('button[name="login"]');
      const hasLoginForm = await this.page.$('form[data-testid="royal_login_form"]');
      
      logger.info(`登录表单元素检测: email=${!!hasEmailInput}, password=${!!hasPasswordInput}, loginButton=${!!hasLoginButton}, loginForm=${!!hasLoginForm}`);
      
      // 更严格的登录页面检测：只有明确的登录表单才算
      if (hasLoginForm) {
        logger.info('检测到登录页面：存在明确的登录表单');
        return true;
      }
      
      // 如果同时存在email和password输入框，需要进一步检查上下文
      if (hasEmailInput && hasPasswordInput) {
        try {
          const emailParent = await this.page.evaluate((input) => 
            input.parentElement.textContent, hasEmailInput);
          const passwordParent = await this.page.evaluate((input) => 
            input.parentElement.textContent, hasPasswordInput);
          
          logger.info(`Email输入框父容器文本: ${emailParent?.substring(0, 100)}`);
          logger.info(`Password输入框父容器文本: ${passwordParent?.substring(0, 100)}`);
          
          // 检查父容器是否包含明确的登录相关文本
          const loginContextKeywords = ['log in', 'sign in', 'login', 'password', 'email or phone'];
          const hasLoginContext = loginContextKeywords.some(keyword => 
            emailParent?.toLowerCase().includes(keyword) || 
            passwordParent?.toLowerCase().includes(keyword)
          );
          
          if (hasLoginContext) {
            logger.info('检测到登录页面：输入框具有登录上下文');
            return true;
          }
        } catch (e) {
          logger.warn('检查输入框上下文失败:', e.message);
        }
      }
      
      // 检查页面内容是否包含明确的登录提示
      try {
        const pageText = await this.page.evaluate(() => document.body.textContent);
        const loginPrompts = [
          'log in to facebook',
          'sign in to continue',
          'enter your email',
          'enter your password'
        ];
        
        const foundPrompts = loginPrompts.filter(prompt => 
          pageText.toLowerCase().includes(prompt)
        );
        
        if (foundPrompts.length > 0) {
          logger.info(`检测到登录页面：页面内容包含登录提示: ${foundPrompts.join(', ')}`);
          return true;
        }
      } catch (e) {
        logger.warn('检查页面内容失败:', e.message);
      }
      
      logger.info('未检测到登录页面特征，继续正常抓取');
      return false;
      
    } catch (error) {
      logger.warn('检查登录页面失败:', error.message);
      return false;
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
      
      const profileData = {};
      const currentUrl = this.page.url();
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
          const uidPatterns = [
            /"userID":"(\d+)"/,
            /"USER_ID":"(\d+)"/,
            /user_id['"]:['"](\d+)['"]/,
            /profile_id['"]:['"](\d+)['"]/
          ];
          
          for (const pattern of uidPatterns) {
            const match = pageContent.match(pattern);
            if (match) {
              profileData.uid = match[1];
              logger.info(`从页面内容获取到UID: ${profileData.uid}`);
              break;
            }
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
            continue;
          }
        }
        
        // 如果没有获取到昵称，尝试从页面标题获取
        if (!profileData.nickname) {
          const pageTitle = await this.page.title();
          if (pageTitle && !pageTitle.toLowerCase().includes('facebook') && 
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
        postData.extractionMethod = 'redirect_url_id_param';
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
   * 抓取群组信息
   * @returns {Object} 群组数据
   */
  async scrapeGroup() {
    try {
      await this.page.waitForSelector('body', { timeout: 10000 });
      
      const groupData = {};
      
      // 获取当前 URL
      const currentUrl = this.page.url();
      groupData.shareUrl = currentUrl;
      
      // 从 URL 中提取群组 ID
      const groupIdMatch = currentUrl.match(/groups\/(\d+)/);
      if (groupIdMatch) {
        groupData.groupId = groupIdMatch[1];
      }
      
      // 尝试获取群组名称
      try {
        const groupNameSelectors = [
          'h1[data-testid="group-name"]',
          'h1',
          'title'
        ];
        
        for (const selector of groupNameSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const text = await this.page.evaluate(el => el.textContent, element);
              if (text && text.trim()) {
                groupData.groupName = text.trim();
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (error) {
        logger.warn('获取群组名称失败:', error);
      }
      
      // 从页面内容中查找群组信息
      try {
        const pageContent = await this.page.content();
        
        // 查找群组 ID
        if (!groupData.groupId) {
          const groupIdRegex = /"groupID":"(\d+)"/;
          const match = pageContent.match(groupIdRegex);
          if (match) {
            groupData.groupId = match[1];
          }
        }
      } catch (error) {
        logger.warn('从页面内容获取群组信息失败:', error);
      }
      
      return groupData;
    } catch (error) {
      logger.error('抓取群组信息失败:', error);
      throw error;
    }
  }
}

module.exports = FacebookScraperPuppeteerService; 