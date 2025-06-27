/**
 * Facebook 数据抓取服务池 (Playwright)
 * 支持高并发的抓取服务管理器
 * 解决单实例模式的资源竞争问题
 */
const { chromium } = require('playwright');
const { logger, scrapeFailureLogger, scrapeSuccessLogger } = require('../config/logger.config');

/**
 * 轻量化的抓取服务 - 专为服务池优化
 */
class LightweightScraperService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * 初始化浏览器 - 简化配置，提升性能
   */
  async initBrowser() {
    // 简化的启动参数 - 仅保留核心配置
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
        '--memory-pressure-off'
      ],
      ignoreDefaultArgs: ['--enable-automation']
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
    
    // 简化的上下文配置
    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      locale: 'en-US',
      defaultTimeout: 15000,
      defaultNavigationTimeout: 30000
    });

    // 最小化反检测脚本
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
    });

    this.page = await this.context.newPage();
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
   * 抓取数据 - 核心逻辑
   */
  async scrapeData(url, type, options = {}) {
    if (!this.browser) {
      await this.initBrowser();
    }

    try {
      // 快速提取尝试
      if (type !== 'profile') {
        const fastResult = this.tryFastExtract(url, type);
        if (fastResult) {
          return { success: true, data: fastResult };
        }
      }

      // 访问页面
      await this.page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(800); // 减少等待时间
      
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(1500); // 减少等待时间

      // 根据类型抓取数据
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
          throw new Error(`不支持的类型: ${type}`);
      }

      return { success: true, data: result };
    } catch (error) {
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
   * 快速提取UID（无需启动浏览器）
   */
  tryFastExtract(url, type) {
    try {
      if (type === 'post') {
        // 从URL提取账号UID
        const postMatch = url.match(/facebook\.com\/(\d{10,})\/posts/);
        if (postMatch) {
          const uid = postMatch[1];
          return {
            uid,
            sourceUrl: url,
            type: 'post',
            extractMethod: 'fast_url_extract'
          };
        }
      }
      
      if (type === 'group') {
        // 从URL提取群组ID
        const groupMatch = url.match(/\/groups\/(\d{10,})\//);
        if (groupMatch) {
          const groupId = groupMatch[1];
          return {
            groupId: groupId,
            sourceUrl: url,
            type: 'group',
            extractMethod: 'fast_url_extract'
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

      return {
        uid,
        nickname: nickname?.trim() || null,
        type: 'profile',
        extractMethod: 'page_content'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 抓取帖子 - 提取发帖账号UID
   */
  async scrapePost(originalUrl) {
    try {
      // 获取当前页面URL
      const currentUrl = this.page.url();
      const uidMatch = currentUrl.match(/[?&]id=(\d{15,})/);
      if (uidMatch) {
        const uid = uidMatch[1];
        return {
          uid,
          type: 'post',
          sourceUrl: originalUrl,
          redirectUrl: currentUrl,
          extractMethod: 'redirect_url_match'
        };
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
    try {
      // 获取当前页面URL
      const currentUrl = this.page.url();
      const groupIdMatch = originalUrl.match(/\/groups\/(\d{10,})\//);
      if (groupIdMatch) {
        const groupId = groupIdMatch[1];
        return {
          groupId,
          type: 'group',
          sourceUrl: originalUrl,
          redirectUrl: currentUrl,
          extractMethod: 'redirect_url_match'
        };
      }

      throw new Error('无法提取账号UID');
    } catch (error) {
      throw error;
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
    
    this.startCleanupTimer();
    
    logger.info(`[FB-PW-POOL] 🚀 初始化轻量化抓取服务池`);
    logger.info(`[FB-PW-POOL] 📊 配置 - 最大实例: ${this.maxInstances}, 超时: ${this.instanceTimeout}ms`);
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
    
    logger.info(`[FB-PW-POOL] 📞 请求实例: ${instanceId}, 当前活跃: ${this.instances.size}, 队列: ${this.instanceQueue.length}`);
    
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
      logger.warn(`[FB-PW-POOL] ⚠️ 尝试释放不存在的实例: ${instanceId}`);
      return;
    }
    
    logger.info(`[FB-PW-POOL] 🔄 释放实例: ${instanceId}`);
    
    try {
      await instance.service.closeBrowser();
    } catch (error) {
      logger.warn(`[FB-PW-POOL] ⚠️ 关闭实例浏览器失败: ${instanceId}`, error.message);
    }
    
    this.instances.delete(instanceId);
    this.stats.active = this.instances.size;
    this.stats.destroyed++;
    
    // 处理等待队列
    if (this.instanceQueue.length > 0) {
      const waitingRequest = this.instanceQueue.shift();
      this.stats.queued = this.instanceQueue.length;
      
      logger.info(`[FB-PW-POOL] 🎯 处理等待队列，为 ${waitingRequest.instanceId} 创建实例`);
      
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
      logger.info(`[FB-PW-POOL] 🏗️ 创建新实例: ${instanceId}`);
      
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
      
      logger.info(`[FB-PW-POOL] ✅ 实例创建成功: ${instanceId}, 当前活跃: ${this.instances.size}`);
      
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
      logger.info(`[FB-PW-POOL] ⏳ 实例池已满，加入等待队列: ${instanceId}`);
      
      const timeout = setTimeout(() => {
        // 从队列中移除
        const index = this.instanceQueue.findIndex(req => req.instanceId === instanceId);
        if (index !== -1) {
          this.instanceQueue.splice(index, 1);
          this.stats.queued = this.instanceQueue.length;
          this.stats.queueTimeouts++;
        }
        
        logger.warn(`[FB-PW-POOL] ⏰ 等待实例超时: ${instanceId}`);
        reject(new Error(`等待实例超时: ${instanceId} (${this.instanceTimeout}ms)`));
      }, this.instanceTimeout);
      
      this.instanceQueue.push({
        instanceId,
        createdAt: Date.now(),
        resolve: (instance) => {
          clearTimeout(timeout);
          logger.info(`[FB-PW-POOL] 🎉 等待队列请求获得实例: ${instanceId}`);
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
    
    logger.info(`[FB-PW-POOL] 🧹 启动清理定时器，间隔: ${this.cleanupInterval}ms`);
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
      logger.info(`[FB-PW-POOL] 🧹 清理 ${staleInstances.length} 个过期实例`);
      
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
      logger.info(`[FB-PW-POOL] 🧹 清理 ${expiredQueueRequests.length} 个过期队列请求`);
      
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
    logger.info(`[FB-PW-POOL] 📤 拒绝 ${this.instanceQueue.length} 个等待中的请求`);
    while (this.instanceQueue.length > 0) {
      const request = this.instanceQueue.shift();
      request.reject(new Error('服务池正在关闭'));
    }
    
    // 关闭所有活跃实例
    const instances = Array.from(this.instances.keys());
    logger.info(`[FB-PW-POOL] 🔄 关闭 ${instances.length} 个活跃实例`);
    
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
      logger.info(`[FB-PW-POOL] 🎯 开始抓取: ${url}, 类型: ${type}`);
      instance = await this.acquireInstance();
      
      const acquireTime = Date.now() - startTime;
      logger.info(`[FB-PW-POOL] 🎪 获取实例耗时: ${acquireTime}ms, 实例: ${instance.instanceId}`);
      
      // 更新使用时间
      instance.updateLastUsed();
      
      // 执行抓取
      const serviceResult = await instance.service.scrapeData(url, type, options);
      
      const totalTime = Date.now() - startTime;
      
      if (serviceResult.success) {
        this.stats.successfulRequests++;
        logger.info(`[FB-PW-POOL] ✅ 抓取完成: ${url}, 总耗时: ${totalTime}ms, 实例: ${instance.instanceId}`);
        
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
   * 批量抓取方法
   * @param {Array} requests - 请求数组 [{url, type, options}]
   * @param {Object} batchOptions - 批量选项
   * @returns {Array} 抓取结果数组
   */
  async batchScrapeData(requests, batchOptions = {}) {
    const { concurrency = this.maxInstances, timeout = 300000 } = batchOptions;
    
    logger.info(`[FB-PW-POOL] 🔥 开始批量抓取: ${requests.length} 个请求, 并发度: ${concurrency}`);
    
    const startTime = Date.now();
    const results = [];
    
    // 分批处理
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      logger.info(`[FB-PW-POOL] 📦 处理批次 ${Math.floor(i / concurrency) + 1}, 包含 ${batch.length} 个请求`);
      
      const batchPromises = batch.map(async (request, index) => {
        try {
          const result = await this.scrapeData(request.url, request.type, request.options);
          return { index: i + index, result };
        } catch (error) {
          return { 
            index: i + index, 
            result: { 
              success: false, 
              error: {
                code: 'BATCH_ERROR',
                message: error.message
              }
            } 
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => r.result.success).length;
    const failCount = results.length - successCount;
    
    logger.info(`[FB-PW-POOL] 🎉 批量抓取完成: ${successCount} 成功, ${failCount} 失败, 总耗时: ${totalTime}ms`);
    
    return {
      success: true,
      results: results.sort((a, b) => a.index - b.index).map(r => r.result),
      summary: {
        total: requests.length,
        successful: successCount,
        failed: failCount,
        totalTime: totalTime
      }
    };
  }

  /**
   * 识别链接类型
   * @param {string} url - Facebook 链接
   * @returns {string} 链接类型 ('profile', 'post', 'group')
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