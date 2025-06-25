/**
 * 阿里云OSS传输器
 * 用于将Winston日志上传到阿里云OSS
 */
const Transport = require('winston-transport');
const OSS = require('ali-oss');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * 自定义Winston传输器，将日志上传到阿里云OSS
 */
class OssTransport extends Transport {
  /**
   * 构造函数
   * @param {Object} options - 传输器配置选项
   */
  constructor(options = {}) {
    super(options);
    
    this.name = 'OssTransport';
    this.level = options.level || 'info';
    
    // OSS配置
    this.ossConfig = {
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: options.bucket || 'skc-logs'
    };
    
    // 日志文件前缀路径
    this.ossPrefix = options.ossPrefix || 'logs/';
    
    // 日志文件名模式（与本地日志文件名保持一致）
    this.fileNamePattern = options.fileNamePattern || 'log-%DATE%.log';
    
    // 日志刷新间隔（毫秒），默认5分钟
    this.flushInterval = options.flushInterval || 5 * 60 * 1000;
    
    // 本地缓存目录
    this.tempDir = options.tempDir || path.join(os.tmpdir(), 'winston-oss-logs', this.ossPrefix.replace(/[^a-zA-Z0-9]/g, '-'));
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // 当前日志文件（添加进程ID避免多进程冲突）
    this.currentDate = new Date().toISOString().split('T')[0];
    this.currentFileName = this._getLogFileName();
    this.tempFileName = this._getTempFileName(); // 临时文件名（包含进程ID）
    this.currentFilePath = path.join(this.tempDir, this.tempFileName);
    
    // OSS客户端
    this.ossClient = null;
    
    // 启动定时上传
    this._initOssClient();
    this._scheduleUpload();
  }
  
  /**
   * 初始化OSS客户端
   * @private
   */
  _initOssClient() {
    try {
      this.ossClient = new OSS({
        region: this.ossConfig.region,
        accessKeyId: this.ossConfig.accessKeyId,
        accessKeySecret: this.ossConfig.accessKeySecret,
        bucket: this.ossConfig.bucket
      });
    } catch (error) {
      console.error('OSS客户端初始化失败:', error);
    }
  }
  
  /**
   * 获取日志文件名（与本地日志文件名保持一致）
   * @private
   * @returns {string} 日志文件名
   */
  _getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return this.fileNamePattern.replace('%DATE%', date);
  }
  
  /**
   * 获取临时文件名（包含进程ID）
   * @private
   * @returns {string} 临时文件名
   */
  _getTempFileName() {
    const pid = process.pid.toString();
    const date = new Date().toISOString().split('T')[0];
    const baseFileName = this.fileNamePattern.replace('%DATE%', date);
    return `${baseFileName}-${pid}`;
  }
  
  /**
   * 安排定时上传任务
   * @private
   */
  _scheduleUpload() {
    // 定时上传日志
    setInterval(() => {
      this._checkAndRotateFile();
      this._uploadToOss();
    }, this.flushInterval);
    
    // 程序退出时上传
    process.on('beforeExit', () => {
      this._uploadToOss();
    });
  }
  
  /**
   * 检查并轮换日志文件
   * @private
   */
  _checkAndRotateFile() {
    const currentDate = new Date().toISOString().split('T')[0];
    if (currentDate !== this.currentDate) {
      // 上传旧文件
      this._uploadToOss();
      
      // 更新日期和文件名
      this.currentDate = currentDate;
      this.currentFileName = this._getLogFileName();
      this.tempFileName = this._getTempFileName(); // 临时文件名（包含进程ID）
      this.currentFilePath = path.join(this.tempDir, this.tempFileName);
    }
  }
  
  /**
   * 上传日志到OSS
   * @private
   */
  async _uploadToOss() {
    if (!this.ossClient) {
      console.error('OSS客户端未初始化，无法上传日志');
      return;
    }
    
    if (!fs.existsSync(this.currentFilePath)) {
      return; // 文件不存在，不需要上传
    }
    
    try {
      // 检查文件大小
      const stats = fs.statSync(this.currentFilePath);
      if (stats.size === 0) {
        return; // 空文件，不需要上传
      }
      
      // 构建OSS路径（使用统一的文件名，不包含进程ID）
      const ossPath = `${this.ossPrefix}${this.currentFileName}`;
      
      // 读取当前临时文件内容
      const newContent = fs.readFileSync(this.currentFilePath);
      
      try {
        // 尝试获取OSS上现有文件内容
        const existingResult = await this.ossClient.get(ossPath);
        const existingContent = existingResult.content;
        
        // 合并内容（追加新内容到现有内容）
        const combinedContent = Buffer.concat([existingContent, newContent]);
        
        // 上传合并后的内容
        await this.ossClient.put(ossPath, combinedContent);
        
        console.log(`日志已追加上传到OSS: ${ossPath}`);
      } catch (getError) {
        // OSS文件不存在，直接上传新内容
        if (getError.code === 'NoSuchKey') {
          await this.ossClient.put(ossPath, newContent);
          console.log(`日志已首次上传到OSS: ${ossPath}`);
        } else {
          throw getError;
        }
      }
      
      // 上传成功后清空临时文件内容（但保留文件）
      fs.truncateSync(this.currentFilePath, 0);
    } catch (error) {
      console.error('上传日志到OSS失败:', error);
    }
  }
  
  /**
   * 日志写入方法
   * @param {Object} info - 日志信息
   * @param {Function} callback - 回调函数
   */
  log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });
    
    // 检查并轮换日志文件
    this._checkAndRotateFile();
    
    // 格式化日志 - 根据transport配置决定格式
    let logEntry;
    if (this.ossPrefix.includes('scrape-')) {
      // 抓取日志只输出消息内容，与本地格式保持一致
      logEntry = `${info.message}\n`;
    } else {
      // 普通日志使用完整格式
      const timestamp = info.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);
      logEntry = `${timestamp} [${info.level}]: ${info.message}\n`;
    }
    
    // 追加到本地文件
    fs.appendFileSync(this.currentFilePath, logEntry);
    
    // 调用回调
    callback();
  }
}

module.exports = OssTransport; 