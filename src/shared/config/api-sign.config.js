/**
 * API签名认证配置
 */

/**
 * 获取API签名密钥
 * 根据环境变量返回对应的密钥配置
 */
function getApiSignConfig() {
  return {
    // 签名密钥 - 不同环境使用不同密钥
    secret: process.env.API_SIGN_SECRET,
    
    // 签名失效时间(秒)
    expireTime: parseInt(process.env.API_SIGN_EXPIRE_TIME, 10) || 300,
    
    // 时间戳允许的误差(秒)
    timeOffset: 60,
    
    // 不需要验证签名的路径前缀
    excludePaths: [
      '/health',
      '/csrf-token'
    ]
  };
}

module.exports = getApiSignConfig; 