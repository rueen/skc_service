/**
 * 阿里云OSS测试脚本
 */
require('dotenv').config(); // 加载环境变量
const OSS = require('ali-oss');

// 检查环境变量是否存在
function checkEnvVariables() {
  const requiredEnvVars = [
    'OSS_ACCESS_KEY_ID',
    'OSS_ACCESS_KEY_SECRET',
    'OSS_REGION',
    'OSS_BUCKET'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('缺少以下环境变量:');
    missing.forEach(varName => console.error(`- ${varName}`));
    console.error('\n请确保.env文件中包含这些变量，且已正确加载');
    return false;
  }
  
  console.log('所有必需的环境变量已设置:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    // 屏蔽敏感信息，只显示部分值
    const displayValue = varName.includes('SECRET') ? 
      `${value.substring(0, 3)}...${value.substring(value.length - 3)}` : 
      value;
    console.log(`- ${varName}: ${displayValue}`);
  });
  
  return true;
}

async function testOssConnection() {
  // 首先检查环境变量
  if (!checkEnvVariables()) {
    return;
  }
  
  // 创建OSS客户端
  const client = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET
  });

  try {
    // 测试listBuckets API
    console.log('\n测试OSS连接...');
    const result = await client.listBuckets();
    console.log('OSS连接成功!');
    console.log('当前账号的Bucket列表:');
    result.buckets.forEach(bucket => {
      console.log(`- ${bucket.name} (${bucket.region})`);
    });

    // 测试当前Bucket
    console.log(`\n当前配置的Bucket: ${process.env.OSS_BUCKET}`);
    if (result.buckets.some(bucket => bucket.name === process.env.OSS_BUCKET)) {
      console.log('Bucket存在，配置有效');
    } else {
      console.log('警告: 配置的Bucket不在当前账号下，请检查配置');
    }
  } catch (error) {
    console.error('OSS连接测试失败:');
    console.error(error);
  }
}

testOssConnection(); 