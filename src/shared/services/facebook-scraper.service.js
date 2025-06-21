/**
 * Facebook 数据抓取服务
 * 基于 Playwright 实现的 Facebook 数据抓取功能
 */
const { chromium } = require('playwright');
const logger = require('../config/logger.config');

class FacebookScraperService {
  constructor() {
    this.browser = null;
    this.context = null;
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
      this.browser = await chromium.launch({ ...defaultOptions, ...options });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        // 增加更长的超时时间
        timeout: 60000
      });
      
      this.page = await this.context.newPage();
      
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
      await this.page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        // 阻止图片、字体、媒体文件的加载以提高速度
        if (['image', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      logger.info('浏览器初始化成功');
    } catch (error) {
      logger.error('浏览器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    try {
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      logger.info('浏览器已关闭');
    } catch (error) {
      logger.error('关闭浏览器时出错:', error);
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
    const { timeout = 60000, retries = 3 } = options; // 增加默认超时时间到60秒
    
    let attempt = 0;
    while (attempt < retries) {
      try {
        logger.info(`开始第 ${attempt + 1} 次抓取尝试: ${url}`);
        
        await this.initBrowser({ headless: options.headless !== false });
        
        // 设置页面超时
        this.page.setDefaultTimeout(timeout);
        this.page.setDefaultNavigationTimeout(timeout);
        
        // 访问页面，使用更宽松的等待条件
        logger.info('正在访问页面...');
        await this.page.goto(url, { 
          waitUntil: 'domcontentloaded', // 改为更快的等待条件
          timeout: timeout 
        });
        
        // 等待页面基本加载完成
        logger.info('等待页面加载...');
        await this.page.waitForTimeout(3000);
        
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
            result = await this.scrapePost();
            break;
          case 'group':
            result = await this.scrapeGroup();
            break;
          default:
            throw new Error(`不支持的数据类型: ${type}`);
        }
        
        await this.closeBrowser();
        logger.info(`抓取成功: ${url}`);
        
        return {
          success: true,
          type,
          data: result,
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        attempt++;
        logger.error(`抓取失败 (尝试 ${attempt}/${retries}): ${error.message}`);
        
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
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // 指数退避，最大10秒
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
      
      // 检查更多可能的登录相关元素
      const hasGenericLoginForm = await this.page.$('form[action*="login"]');
      const hasLoginContainer = await this.page.$('[data-testid*="login"]');
      
      logger.info(`额外登录元素检测: genericLoginForm=${!!hasGenericLoginForm}, loginContainer=${!!hasLoginContainer}`);
      
      // 更严格的登录页面检测：只有明确的登录表单才算
      if (hasLoginForm) {
        logger.info('检测到登录页面：存在明确的登录表单');
        return true;
      }
      
      // 如果同时存在email和password输入框，需要进一步检查上下文
      if (hasEmailInput && hasPasswordInput) {
        // 检查这些输入框是否真的是登录表单的一部分
        // 通过检查它们的父容器和周围文本来判断
        try {
          const emailParent = await hasEmailInput.locator('xpath=..').textContent();
          const passwordParent = await hasPasswordInput.locator('xpath=..').textContent();
          
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
          } else {
            logger.info('输入框不具有登录上下文，可能是页面其他功能的输入框');
          }
        } catch (e) {
          logger.warn('检查输入框上下文失败:', e.message);
        }
      }
      
      // 如果只有单个登录按钮，可能是误判，需要更严格的检查
      if (hasLoginButton) {
        // 检查是否真的是登录页面的登录按钮
        const buttonText = await hasLoginButton.textContent();
        logger.info(`发现登录按钮，文本内容: ${buttonText}`);
        
        // 只有当按钮文本明确表示登录时才判定
        if (buttonText && (buttonText.toLowerCase().includes('log in') || buttonText.toLowerCase().includes('sign in'))) {
          logger.info('检测到登录页面：存在明确的登录按钮');
          return true;
        }
      }
      
      // 检查页面内容是否包含明确的登录提示
      try {
        const pageText = await this.page.textContent('body');
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
      
      // 等待页面关键元素加载，使用更宽松的等待条件
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
          // Facebook 特定的选择器
          'h1[data-testid="profile-name"]',
          '[data-testid="profile-name"]',
          'h1[data-testid="profile_name"]',
          // 通用的标题选择器
          'h1[role="heading"]',
          'h1:first-of-type',
          // 旧版Facebook选择器
          '.profileName',
          '#fb-timeline-cover-name',
          '.fb-timeline-cover-name',
          // 备用选择器
          'h1',
          'h2[role="heading"]'
        ];
        
        for (const selector of nicknameSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const text = await element.textContent();
              if (text && text.trim() && 
                  !text.toLowerCase().includes('facebook') &&
                  !text.toLowerCase().includes('log in') &&
                  !text.toLowerCase().includes('login') &&
                  text.length < 100) { // 避免获取到过长的文本
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
            // 移除常见的网站后缀
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
        // 使用选择器匹配统计数据，而不是文本匹配
        const statsSelectors = [
          // 粉丝数选择器
          '[data-testid="profile-followers-count"]',
          '[data-testid="followers-count"]',
          'a[href*="followers"] span',
          'a[href*="followers"]',
          // 通用统计数据选择器
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
              const text = await element.textContent();
              const href = await element.getAttribute('href') || '';
              
              // 检查是否是粉丝数相关的链接或元素
              if (href.includes('followers') || href.includes('subscriber')) {
                const numberMatch = text.match(/(\d+(?:[,.\s]\d+)*[KMB]?)/);
                if (numberMatch) {
                  profileData.followers = this.parseNumber(numberMatch[1]);
                  logger.info(`获取到粉丝数: ${profileData.followers}`);
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
              const text = await element.textContent();
              const href = await element.getAttribute('href') || '';
              
              // 检查是否是好友数相关的链接或元素
              if (href.includes('friends') || href.includes('friend')) {
                const numberMatch = text.match(/(\d+(?:[,.\s]\d+)*[KMB]?)/);
                if (numberMatch) {
                  profileData.friends = this.parseNumber(numberMatch[1]);
                  logger.info(`获取到好友数: ${profileData.friends}`);
                  break;
                }
              }
            }
            if (profileData.friends) break;
          } catch (e) {
            continue;
          }
        }
        
        // 如果上述方法都失败，尝试从页面结构中查找数字
        if (!profileData.followers && !profileData.friends) {
          const allLinks = await this.page.$$('a');
          for (const link of allLinks) {
            try {
              const href = await link.getAttribute('href') || '';
              const text = await link.textContent();
              
              if (href.includes('followers') && !profileData.followers) {
                const numberMatch = text.match(/(\d+(?:[,.\s]\d+)*[KMB]?)/);
                if (numberMatch) {
                  profileData.followers = this.parseNumber(numberMatch[1]);
                  logger.info(`从链接获取到粉丝数: ${profileData.followers}`);
                }
              }
              
              if (href.includes('friends') && !profileData.friends) {
                const numberMatch = text.match(/(\d+(?:[,.\s]\d+)*[KMB]?)/);
                if (numberMatch) {
                  profileData.friends = this.parseNumber(numberMatch[1]);
                  logger.info(`从链接获取到好友数: ${profileData.friends}`);
                }
              }
            } catch (e) {
              continue;
            }
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
              const src = await avatarElement.getAttribute('src');
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
    
    // 移除所有空格和常见的分隔符
    const cleanStr = str.replace(/[\s,.']/g, '');
    
    // 提取数字部分
    const numberMatch = cleanStr.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return 0;
    
    const num = parseFloat(numberMatch[1]);
    const upperStr = cleanStr.toUpperCase();
    
    // 支持各种语言的数量级后缀
    if (upperStr.includes('K') || upperStr.includes('千')) {
      return Math.round(num * 1000);
    } else if (upperStr.includes('M') || upperStr.includes('万')) {
      return Math.round(num * (upperStr.includes('万') ? 10000 : 1000000));
    } else if (upperStr.includes('B') || upperStr.includes('亿')) {
      return Math.round(num * (upperStr.includes('亿') ? 100000000 : 1000000000));
    } else {
      return Math.round(num);
    }
  }

  /**
   * 抓取帖子信息
   * @returns {Object} 帖子数据
   */
  async scrapePost() {
    try {
      await this.page.waitForSelector('body', { timeout: 10000 });
      
      const postData = {};
      
      // 获取当前 URL
      const currentUrl = this.page.url();
      postData.postUrl = currentUrl;
      
      // 从 URL 中提取作者 UID
      const uidMatch = currentUrl.match(/facebook\.com\/(\d+)\/posts/);
      if (uidMatch) {
        postData.authorUid = uidMatch[1];
      }
      
      // 尝试从页面内容获取作者信息
      try {
        const pageContent = await this.page.content();
        
        // 查找作者 UID
        if (!postData.authorUid) {
          const uidRegex = /"userID":"(\d+)"/;
          const match = pageContent.match(uidRegex);
          if (match) {
            postData.authorUid = match[1];
          }
        }
        
        // 获取帖子 ID
        const postIdMatch = pageContent.match(/"post_id":"(\d+)"/);
        if (postIdMatch) {
          postData.postId = postIdMatch[1];
        }
      } catch (error) {
        logger.warn('从页面内容获取信息失败:', error);
      }
      
      // 尝试获取作者名称
      try {
        const authorSelectors = [
          '[data-testid="post-author-name"]',
          '[role="link"] strong',
          'h3 a',
          'h4 a'
        ];
        
        for (const selector of authorSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const text = await element.textContent();
              if (text && text.trim()) {
                postData.authorName = text.trim();
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (error) {
        logger.warn('获取作者名称失败:', error);
      }
      
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
              const text = await element.textContent();
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

module.exports = FacebookScraperService; 