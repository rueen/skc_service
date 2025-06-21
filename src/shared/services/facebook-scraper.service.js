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
        const pageTitle = await this.page.title();
        if (pageTitle.includes('Log in') || pageTitle.includes('登录') || 
            pageTitle.includes('Login') || pageTitle.includes('Sign in')) {
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
   * 根据错误类型获取错误代码
   * @param {Error} error - 错误对象
   * @returns {string} 错误代码
   */
  getErrorCode(error) {
    if (error.message.includes('timeout')) {
      return 'TIMEOUT_ERROR';
    } else if (error.message.includes('登录') || error.message.includes('Login')) {
      return 'LOGIN_REQUIRED';
    } else if (error.message.includes('网络') || error.message.includes('Network')) {
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
    } else if (error.message.includes('登录') || error.message.includes('Login')) {
      return '该内容需要登录才能访问';
    } else if (error.message.includes('网络') || error.message.includes('Network')) {
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
          'h1[data-testid="profile-name"]',
          'h1[role="heading"]',
          '[data-testid="profile-name"]',
          'h1',
          '.profileName',
          '#fb-timeline-cover-name'
        ];
        
        for (const selector of nicknameSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const text = await element.textContent();
              if (text && text.trim() && !text.includes('Facebook')) {
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
          if (pageTitle && !pageTitle.includes('Facebook') && !pageTitle.includes('Log in')) {
            profileData.nickname = pageTitle.replace(/\s*\|\s*Facebook$/, '').trim();
            logger.info(`从页面标题获取到昵称: ${profileData.nickname}`);
          }
        }
      } catch (error) {
        logger.warn('获取昵称失败:', error.message);
      }
      
      // 尝试获取粉丝数和好友数
      logger.info('正在获取统计数据...');
      try {
        const statsText = await this.page.textContent('body');
        
        // 匹配粉丝数的多种模式
        const followersPatterns = [
          /(\d+(?:,\d+)*)\s*(?:followers|粉丝|关注者)/i,
          /(\d+(?:\.\d+)?[KMB]?)\s*(?:followers|粉丝|关注者)/i
        ];
        
        for (const pattern of followersPatterns) {
          const match = statsText.match(pattern);
          if (match) {
            profileData.followers = this.parseNumber(match[1]);
            logger.info(`获取到粉丝数: ${profileData.followers}`);
            break;
          }
        }
        
        // 匹配好友数的多种模式
        const friendsPatterns = [
          /(\d+(?:,\d+)*)\s*(?:friends|好友|朋友)/i,
          /(\d+(?:\.\d+)?[KMB]?)\s*(?:friends|好友|朋友)/i
        ];
        
        for (const pattern of friendsPatterns) {
          const match = statsText.match(pattern);
          if (match) {
            profileData.friends = this.parseNumber(match[1]);
            logger.info(`获取到好友数: ${profileData.friends}`);
            break;
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
   * 解析数字字符串，支持K、M、B后缀
   * @param {string} str - 数字字符串
   * @returns {number} 解析后的数字
   */
  parseNumber(str) {
    if (!str) return 0;
    
    const cleanStr = str.replace(/,/g, '');
    const num = parseFloat(cleanStr);
    
    if (cleanStr.includes('K')) {
      return Math.round(num * 1000);
    } else if (cleanStr.includes('M')) {
      return Math.round(num * 1000000);
    } else if (cleanStr.includes('B')) {
      return Math.round(num * 1000000000);
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