/**
 * Facebook 数据抓取服务池 (Playwright)
 * 支持高并发的抓取服务管理器
 * 解决单实例模式的资源竞争问题
 */
const FacebookScraperPlaywrightService = require('./facebook-scraper-playwright.service');
const { logger } = require('../config/logger.config');

class FacebookScraperPlaywrightPoolService {
  constructor(options = {}) {
    this.maxInstances = options.maxInstances || 5; // 最大并发实例数
    this.instanceTimeout = options.instanceTimeout || 300000; // 5分钟超时
    this.cleanupInterval = options.cleanupInterval || 60000; // 1分钟清理一次
    this.maxQueueSize = options.maxQueueSize || 50; // 最大等待队列长度
    
    this.instances = new Map(); // 存储活跃实例
    this.instanceQueue = []; // 等待队列
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
    
    // 启动清理定时器
    this.startCleanupTimer();
    
    logger.info(`[FB-PW-POOL] 🚀 初始化抓取服务池`);
    logger.info(`[FB-PW-POOL] 📊 配置 - 最大实例: ${this.maxInstances}, 超时: ${this.instanceTimeout}ms, 最大队列: ${this.maxQueueSize}`);
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
      
      const service = new FacebookScraperPlaywrightService();
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
      logger.warn('[FB-PW-POOL] URL解析失败，默认作为个人资料处理:', error.message);
      return 'profile';
    }
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
      const result = await instance.service.scrapeData(url, type, options);
      
      const totalTime = Date.now() - startTime;
      logger.info(`[FB-PW-POOL] ✅ 抓取完成: ${url}, 总耗时: ${totalTime}ms, 实例: ${instance.instanceId}`);
      
      this.stats.successfulRequests++;
      
      // 添加池统计信息到结果中
      result.poolStats = {
        instanceId: instance.instanceId,
        instanceInfo: instance.getInfo(),
        acquireTime: acquireTime,
        totalTime: totalTime
      };
      
      return result;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`[FB-PW-POOL] ❌ 抓取失败: ${url}, 耗时: ${totalTime}ms`, error);
      
      this.stats.failedRequests++;
      
      return {
        success: false,
        error: {
          code: 'POOL_SCRAPE_ERROR',
          message: error.message,
          details: error.stack
        },
        poolStats: {
          instanceId: instance ? instance.instanceId : 'N/A',
          acquireTime: instance ? Date.now() - startTime : 0,
          totalTime: totalTime
        },
        timestamp: new Date().toISOString()
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
              error: error.message,
              request: request
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
        totalTime: totalTime,
        avgTime: (totalTime / requests.length).toFixed(1) + 'ms'
      },
      poolStats: this.getStats()
    };
  }
}

module.exports = FacebookScraperPlaywrightPoolService; 