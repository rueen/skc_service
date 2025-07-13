/*
 * @Author: diaochan
 * @Date: 2025-04-18 22:39:33
 * @LastEditors: diaochan
 * @LastEditTime: 2025-07-09 15:45:32
 * @Description: 
 */
module.exports = {
  loginSuccess: 'Matagumpay na naka-login',
  notSetPassword: 'Hindi pa naka-set ang password ng account, mangyaring makipag-ugnayan sa administrator',
  passwordError: 'Maling password',
  userDisabled: 'Naka-disable na ang user',
  loginFailed: 'Hindi matagumpay ang pag-login, pakisubok muli mamaya',
  userNotFund: 'Hindi mahanap ang user',
  passwordNotMatch: 'Hindi tumutugma ang bagong password at ang kumpirmasyon ng password',
  currentPasswordError: 'Hindi tama ang kasalukuyang password',
  passwordFormatError: 'Ang password ay dapat may 8–20 na karakter at dapat naglalaman ng mga letra at numero',

  article: {
    notFound: 'Hindi mahanap ang artikulo',
  },

  group: {
    noPermission: 'Hindi ka ang may-ari ng grupong ito, walang pahintulot na tingnan ang listahan ng mga miyembro',
    notFound: 'Hindi mahanap ang grupo',
  },

  account: {
    notFound: 'Hindi mahanap ang account',
    noPermissionView: 'Walang pahintulot na tingnan ang account na ito',
    noPermissionUpdate: 'Walang pahintulot na i-update ang account na ito',
    noPermissionDelete: 'Walang pahintulot na tanggalin ang account na ito',
    alreadyExists: 'Isang account bawat platform',
    addSuccess: 'Matagumpay na nadagdag ang account, mangyaring maghintay para sa pagsusuri',
    updateSuccess: 'Matagumpay na na-update ang account, mangyaring maghintay para sa pagsusuri',
    deleteSuccess: 'Matagumpay na natanggal ang account',
    duplicateBind: 'Nagamit na ang account na ito. Bawal ang paulit-ulit na pag-bind',
    rejectTimesLimit: 'Ang account ay hindi maaaring i-update dahil ang pag-reject ay nahahati sa {maxRejectTimes} beses',
  },

  member: {
    notFound: 'Hindi mahanap ang miyembro',
  },

  notification: {
    notFound: 'Hindi mahanap ang abiso o walang pahintulot na gumawa',
    markSuccess: 'Matagumpay na namarkahan ang {affectedCount} na abiso bilang nabasa na',
  },

  task: {
    notFound: 'Hindi mahanap ang gawain',
    onlyEnrollActiveTask: 'Maaari lamang mag-enroll sa mga aktibong gawain',
    memberNotFound: 'Hindi mahanap ang miyembro',
    alreadyEnrolled: 'Naka-enroll ka na sa gawaing ito',
    notMeetEnrollCondition: 'Hindi nakakatugon sa mga kondisyon para sa pag-enroll',
    needAddAccount: 'Mangyaring magdagdag muna ng account sa kaukulang channel',
    accountNotApproved: 'Ang inyong account sa channel na ito ay hindi pa naaprubahan, maghintay para sa pag-apruba bago mag-enroll',
    needCompletePreviousTask: 'Mangyaring kumpletuhin muna ang nakaraang gawain sa task group',
    submitSuccess: 'Matagumpay na naisumite ang gawain',
    resubmitSuccess: 'Matagumpay na naisumite muli ang gawain',
    onlySubmitActiveTask: 'Maaari lamang magsumite ng mga aktibong gawain',
    forbiddenSubmitWithoutEnroll: 'Mangyaring mag-enroll muna sa gawain',
    taskSubmitted: 'Naisumite na ang gawain, kasalukuyang sinusuri',
    taskSubmittedAndApproved: 'Naisumite na ang gawain at naaprubahan na',
    taskFull: 'Puno na ang mga slot para sa gawain, hindi maaaring magsumite',
    noPermissionView: 'Walang pahintulot na tingnan ang rekord ng pagsusumite na ito',
    rejectTimesLimit: 'Ang gawain ay hindi maaaring i-update dahil ang pag-reject ay nahahati sa {maxRejectTimes} beses',
  },

  taskGroup: {
    notFound: 'Hindi mahanap ang task group',
  },

  withdrawal: {
    notFound: 'Hindi mahanap ang withdrawal account',
    noPermissionUpdate: 'Walang pahintulot na baguhin ang withdrawal account na ito',
    noPermissionDelete: 'Hindi mahanap ang withdrawal account o walang pahintulot na tanggalin ito',
    noPermissionUse: 'Walang pahintulot na gamitin ang withdrawal account na ito',
    amountLimit: 'Ang halaga ng withdrawal ay dapat na higit sa 0',
    pendingWithdrawal: 'Mayroon kang nakabinbing withdrawal application, mangyaring maghintay hanggang ito ay naproseso bago mag-apply muli',
    insufficientBalance: 'Hindi sapat ang balanse ng account',
  }
}; 