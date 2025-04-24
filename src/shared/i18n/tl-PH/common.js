/*
 * @Author: diaochan
 * @Date: 2025-04-18 22:39:08
 * @LastEditors: diaochan
 * @LastEditTime: 2025-04-24 15:48:17
 * @Description: 
 */
/**
 * Pangkalahatang pagsasalin sa Tagalog
 * Naglalaman ng pangkalahatang mga mensahe at teksto ng sistema
 */
module.exports = {
  // Pangkalahatang mga mensahe ng tugon
  success: 'Tagumpay',
  failed: 'Nabigo',
  serverError: 'May error sa server, pakisubukang muli mamaya',
  badRequest: 'May mali sa parameter ng kahilingan',
  unauthorized: 'Hindi awtorisado, mangyaring mag-login muna',
  forbidden: 'Walang pahintulot na gumawa',
  notFound: 'Hindi mahanap ang resource',
  rateLimit: 'Magkakasalang mag-request sa server, mangyaring subukan muli mamaya',
  loginRateLimit: 'Magkakasalang mag-login sa server, mangyaring subukan muli mamaya',
  missingToken:'No token provided',
  invalidToken:'Invalid token',
  passwordChanged:'Password changed, please login again',
  authFailed:'Authentication failed',
  
  // Iba pang mga pangkalahatang pagsasalin
  validation: {
    page: 'Ang page number ay dapat na buong numero na higit sa 0',
    pageSize: 'Ang bilang ng item sa bawat pahina ay dapat na buong numero na higit sa 0',
    mustBeString: 'Ang {field} ay dapat na string',
    mustBeInt: 'Ang {field} ay dapat na buong numero',
    invalid: 'Hindi valid ang value ng {field}',
    timeFormatInvalid: 'Hindi tama ang format ng oras sa {field}',
    mustNotBeEmpty: 'Ang {field} ay hindi maaaring walang laman',
    mustBeArray: 'Ang {field} ay dapat na array',
    formatInvalid: 'Hindi tama ang format ng {field}',
    mustBeNonNegativeInteger: 'Ang {field} ay dapat na hindi negatibong buong numero',
    maxLength: 'Ang haba ng {field} ay hindi maaaring lumampas sa {max} na karakter',
    minLength: 'Ang haba ng {field} ay hindi maaaring mas mababa sa {min} na karakter',
    memberAccountLength: 'Ang haba ng miyembro account ay dapat na nasa pagitan ng 4-50 na karakter',
    memberPasswordLength: 'Ang haba ng password ay dapat na nasa pagitan ng 8-20 digit',
    memberPasswordFormat: 'Ang password ay dapat may letrang may numero',
    confirmPasswordNotMatch: 'Ang kumpirmasyon ng password ay hindi tumutugma sa bagong password',
    amountFormat: 'Hindi tama ang format ng halaga ng {field}',
    waiterUsernameLength: 'Ang haba ng username ay dapat na nasa pagitan ng 3-20 na karakter',
  }
}; 