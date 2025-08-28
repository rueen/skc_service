/*
 * @Author: diaochan
 * @Date: 2025-01-27 00:00:00
 * @LastEditors: diaochan
 * @LastEditTime: 2025-01-27 00:00:00
 * @Description: 
 */
/**
 * 公共日语翻译
 * 包含系统通用的提示信息和文本
 */
module.exports = {
  // 通用响应消息
  success: '成功',
  failed: '失敗',
  updateSuccess: '更新成功',
  serverError: 'サーバーエラーが発生しました。しばらくしてから再試行してください',
  badRequest: 'リクエストパラメータが無効です',
  unauthorized: '認証されていません。ログインしてください',
  forbidden: 'アクセスが拒否されました',
  notFound: 'リソースが見つかりません',
  rateLimit: 'リクエストが頻繁すぎます。しばらくしてから再試行してください',
  loginRateLimit: 'ログイン試行が頻繁すぎます。1時間後に再試行してください',
  missingToken:'認証トークンが提供されていません',
  invalidToken:'認証トークンが無効または期限切れです',
  passwordChanged:'パスワードが変更されました。再度ログインしてください',
  authFailed:'認証に失敗しました',
  
  // その他の共通翻訳...
  validation: {
    page: 'ページ番号は0より大きい整数である必要があります',
    pageSize: 'ページサイズは0より大きい整数である必要があります',
    mustBeString: '{field}は文字列である必要があります',
    mustBeInt: '{field}は整数である必要があります',
    invalid: '{field}の値が無効です',
    timeFormatInvalid: '{field}の時間形式が正しくありません',
    mustNotBeEmpty: '{field}は空にできません',
    mustBeArray: '{field}は配列である必要があります',
    formatInvalid: '{field}の形式が正しくありません',
    mustBeNonNegativeInteger: '{field}は非負の整数である必要があります',
    maxLength: '{field}は{max}文字以下である必要があります',
    minLength: '{field}は{min}文字以上である必要があります',
    memberAccountLength: 'メンバーアカウントの長さは4〜50文字である必要があります',
    memberPasswordLength: 'パスワードの長さは8〜20文字である必要があります',
    memberPasswordFormat: 'パスワードは文字と数字を含む必要があります',
    confirmPasswordNotMatch: '確認パスワードが新しいパスワードと一致しません',
    amountFormat: '{field}の金額形式が正しくありません',
    waiterUsernameLength: 'ウェイターユーザー名の長さは3〜20文字である必要があります',
    mustBeObject: '{field}はオブジェクトである必要があります',
  }
};
