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
    
    // 日志刷新间隔（毫秒），默认5分钟
    this.flushInterval = options.flushInterval || 5 * 60 * 1000;
    
    // 本地缓存目录
    this.tempDir = options.tempDir || path.join(os.tmpdir(), 'winston-oss-logs');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
    // 当前日志文件
    this.currentDate = new Date().toISOString().split('T')[0];
    this.currentFileName = this._getLogFileName();
    this.currentFilePath = path.join(this.tempDir, this.currentFileName);
    
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
   * 获取日志文件名
   * @private
   * @returns {string} 日志文件名
   */
  _getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    const hostname = os.hostname().replace(/[^a-zA-Z0-9]/g, '-');
    return `${date}-${hostname}-${process.pid}.log`;
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
      this.currentFilePath = path.join(this.tempDir, this.currentFileName);
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
      
      // 构建OSS路径
      const ossPath = `${this.ossPrefix}${this.currentFileName}`;
      
      // 读取文件内容
      const fileContent = fs.readFileSync(this.currentFilePath);
      
      // 上传到OSS
      await this.ossClient.put(ossPath, fileContent);
      
      console.log(`日志已上传到OSS: ${ossPath}`);
      
      // 上传成功后清空文件内容（但保留文件）
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
    
    // 格式化日志
    const logEntry = `${info.timestamp} [${info.level}]: ${info.message}\n`;
    
    // 追加到本地文件
    fs.appendFileSync(this.currentFilePath, logEntry);
    
    // 调用回调
    callback();
  }
}

module.exports = OssTransport; 