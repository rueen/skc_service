/**
 * Facebook 重定向跟踪器服务
 * 用于获取Facebook链接重定向后的最终URL
 * 支持代理配置（本地环境）
 */
const { logger } = require('../config/logger.config');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { HttpsProxyAgent } = require('https-proxy-agent');

class FacebookRedirectTrackerService {
  constructor(options = {}) {
    this.timeout = options.timeout || 15000;
    this.maxRedirects = options.maxRedirects || 10;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // 代理配置 - 仅在本地环境使用
    this.useProxy = process.env.NODE_ENV === 'development';
    this.proxyHost = options.proxyHost || process.env.PROXY_HOST;
    this.proxyPort = options.proxyPort || process.env.PROXY_PORT;
    
    // logger.info(`[FB-REDIRECT] 🔄 初始化重定向跟踪器服务`);
    // logger.info(`[FB-REDIRECT] 📍 代理配置 - 启用: ${this.useProxy}, 主机: ${this.proxyHost || 'N/A'}, 端口: ${this.proxyPort || 'N/A'}`);
  }

  /**
   * 跟踪Facebook链接重定向
   * @param {string} originalUrl - 原始Facebook链接
   * @returns {Promise<Object>} 跟踪结果
   */
  async trackRedirect(originalUrl) {
    const startTime = Date.now();
    
    try {
      // logger.info(`[FB-REDIRECT] 🎯 开始跟踪重定向: ${originalUrl}`);
      
      const finalUrl = await this.followRedirects(originalUrl);
      const totalTime = Date.now() - startTime;
      
      // 检查是否重定向到登录页面
      const isLoginRedirect = this.isLoginRedirect(finalUrl);
      let nextUrl = null;
      
      if (isLoginRedirect) {
        nextUrl = this.extractNextUrl(finalUrl);
        // logger.info(`[FB-REDIRECT] 🔓 检测到登录重定向: ${originalUrl} -> ${finalUrl}`);
        if (nextUrl) {
          // logger.info(`[FB-REDIRECT] 📎 提取到next链接: ${nextUrl}`);
        }
      }
      
      // logger.info(`[FB-REDIRECT] ✅ 重定向跟踪完成: ${originalUrl} -> ${finalUrl}, 耗时: ${totalTime}ms`);
      
      return {
        success: true,
        data: {
          originalUrl,
          finalUrl,
          redirected: originalUrl !== finalUrl,
          isLoginRedirect,
          nextUrl,
          trackingTime: totalTime
        }
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error(`[FB-REDIRECT] ❌ 重定向跟踪失败: ${originalUrl}, 耗时: ${totalTime}ms`, error);
      
      return {
        success: false,
        error: {
          code: 'REDIRECT_TRACKING_ERROR',
          message: error.message,
          originalUrl
        }
      };
    }
  }

  /**
   * 跟踪重定向的核心方法
   * @param {string} url - 要跟踪的URL
   * @param {number} redirectCount - 当前重定向次数
   * @returns {Promise<string>} 最终URL
   */
  async followRedirects(url, redirectCount = 0) {
    if (redirectCount >= this.maxRedirects) {
      throw new Error(`超过最大重定向次数: ${this.maxRedirects}`);
    }

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD', // 使用HEAD方法，只获取响应头
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'close',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        timeout: this.timeout
      };

      // 如果启用代理且配置了代理信息
      if (this.useProxy && this.proxyHost && this.proxyPort) {
        const proxyUrl = `http://${this.proxyHost}:${this.proxyPort}`;
        
        if (isHttps) {
          // 对于HTTPS请求，使用HttpsProxyAgent
          requestOptions.agent = new HttpsProxyAgent(proxyUrl);
          // logger.debug(`[FB-REDIRECT] 🔀 使用HTTPS代理: ${proxyUrl} -> ${url}`);
        } else {
          // 对于HTTP请求，使用标准代理设置
          requestOptions.hostname = this.proxyHost;
          requestOptions.port = parseInt(this.proxyPort);
          requestOptions.path = url;
          requestOptions.headers['Host'] = urlObj.hostname;
          // logger.debug(`[FB-REDIRECT] 🔀 使用HTTP代理: ${proxyUrl} -> ${url}`);
        }
      } else {
        // logger.debug(`[FB-REDIRECT] 🔗 直连请求: ${url}`);
      }

      const req = httpModule.request(requestOptions, (res) => {
        const statusCode = res.statusCode;
        
        // 检查是否为重定向状态码
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          const redirectUrl = this.resolveRedirectUrl(url, res.headers.location);
          // logger.debug(`[FB-REDIRECT] 🔄 重定向 ${statusCode}: ${url} -> ${redirectUrl}`);
          
          // 递归跟踪重定向
          this.followRedirects(redirectUrl, redirectCount + 1)
            .then(resolve)
            .catch(reject);
        } else if (statusCode >= 200 && statusCode < 300) {
          // 成功状态码，返回当前URL
          // logger.debug(`[FB-REDIRECT] 🎯 最终URL: ${url} (状态码: ${statusCode})`);
          resolve(url);
        } else {
          // 错误状态码
          logger.warn(`[FB-REDIRECT] ⚠️ 响应状态码: ${statusCode}, URL: ${url}`);
          resolve(url); // 即使状态码不是200，也返回当前URL
        }
      });

      req.on('error', (error) => {
        let errorMsg = `请求失败: ${error.message}`;
        
        // 提供更详细的错误信息
        if (error.code === 'ECONNREFUSED') {
          errorMsg = `代理连接被拒绝，请检查代理服务器 ${this.proxyHost}:${this.proxyPort} 是否运行`;
        } else if (error.code === 'ENOTFOUND') {
          errorMsg = `无法解析代理服务器地址: ${this.proxyHost}`;
        } else if (error.code === 'ECONNRESET') {
          errorMsg = `代理连接被重置，可能是认证失败或代理服务器问题`;
        }
        
        logger.error(`[FB-REDIRECT] ❌ 请求错误: ${url}`, errorMsg);
        reject(new Error(errorMsg));
      });

      req.on('timeout', () => {
        req.destroy();
        logger.error(`[FB-REDIRECT] ⏰ 请求超时: ${url}`);
        reject(new Error(`请求超时: ${this.timeout}ms`));
      });

      req.end();
    });
  }

  /**
   * 解析重定向URL
   * @param {string} currentUrl - 当前URL
   * @param {string} locationHeader - Location头的值
   * @returns {string} 解析后的重定向URL
   */
  resolveRedirectUrl(currentUrl, locationHeader) {
    try {
      // 如果location是完整URL，直接返回
      if (locationHeader.startsWith('http://') || locationHeader.startsWith('https://')) {
        return locationHeader;
      }
      
      // 如果location是相对路径，基于当前URL解析
      const currentUrlObj = new URL(currentUrl);
      const redirectUrl = new URL(locationHeader, currentUrl);
      
      return redirectUrl.href;
    } catch (error) {
      logger.warn(`[FB-REDIRECT] ⚠️ 解析重定向URL失败: ${locationHeader}`, error);
      return locationHeader; // 回退方案
    }
  }

  /**
   * 检查是否重定向到登录页面
   * @param {string} url - 要检查的URL
   * @returns {boolean} 是否重定向到登录页面
   */
  isLoginRedirect(url) {
    try {
      // 检查URL是否包含Facebook登录页面的特征
      return url.includes('facebook.com/login') && url.includes('next=');
    } catch (error) {
      logger.warn(`[FB-REDIRECT] ⚠️ 检测登录重定向失败: ${url}`, error);
      return false;
    }
  }

  /**
   * 提取next参数
   * @param {string} url - 要提取next参数的URL
   * @returns {string|null} 提取到的next参数，如果为null则表示没有提取到
   */
  extractNextUrl(url) {
    try {
      // 使用正则表达式提取next参数
      const nextMatch = url.match(/[?&]next=([^&]+)/);
      if (nextMatch) {
        const encodedNextUrl = nextMatch[1];
        // 对next参数进行URL解码
        const decodedNextUrl = decodeURIComponent(encodedNextUrl);
        // logger.debug(`[FB-REDIRECT] 🔍 提取next参数: ${encodedNextUrl} -> ${decodedNextUrl}`);
        return decodedNextUrl;
      }
      return null;
    } catch (error) {
      logger.warn(`[FB-REDIRECT] ⚠️ 提取next参数失败: ${url}`, error);
      return null;
    }
  }
}

module.exports = FacebookRedirectTrackerService; 