/**
 * Pagsasalin sa Tagalog para sa Admin
 */
module.exports = {
  usernameOrPasswordError: 'Maling username o password',
  loginSuccess: 'Matagumpay na naka-login',
  loginFailed: 'Hindi matagumpay ang pag-login',
  userNotFound: 'Hindi mahanap ang user',

  account: {
    notFound: 'Hindi mahanap ang account',
    notAssociatedWithMember: 'Hindi naiugnay ang account sa miyembro',
    alreadyInGroup: 'Ang miyembro ay bahagi na ng grupo, na-aprubahan na ang pagsusuri',
    memberNotFound: 'Hindi mahanap ang miyembro',
    noInviter: 'Ang miyembro na si [{nickname}] ay walang taga-anyaya, hindi maaaring awtomatikong italaga sa grupo',
    inviterNoGroup: 'Ang taga-anyaya ay walang kinabibilangang grupo, hindi maaaring awtomatikong italaga sa grupo',
    assignedToInviterGroup: 'Itinalaga sa grupo ng taga-anyaya',
    inviterNoOwner: 'Ang grupo ng taga-anyaya ay puno na at walang may-ari ng grupo',
    inviterAllGroupFull: 'Ang grupo ng taga-anyaya ay puno na, at ang lahat ng grupo sa ilalim ng may-ari ng grupong ito ay puno na rin',
    assignedToOtherGroup: 'Itinalaga sa iba pang grupo sa ilalim ng may-ari ng grupo',
    auditSuccess: 'Matagumpay na naaprubahan ang {success} na account, {failed} na account ang nabigo sa pagsusuri',
    rejectSuccess: 'Matagumpay na tinanggihan ang {count} na account'
  },

  article: {
    locationExists: 'Umiiral na ang lokasyon ng artikulo',
    notFound: 'Hindi mahanap ang artikulo'
  },

  channel: {
    notFound: 'Hindi mahanap ang channel',
    nameExists: 'Umiiral na ang pangalan ng channel',
    associatedAccount: 'May mga nauugnay na account sa channel na ito, hindi maaaring tanggalin',
    associatedTask: 'May mga nauugnay na gawain sa channel na ito, hindi maaaring tanggalin'
  },

  group: {
    notFound: 'Hindi mahanap ang grupo',
    ownerNotFound: 'Hindi mahanap ang may-ari ng grupo',
    associatedMember: 'May mga nauugnay na miyembro sa grupo na ito, hindi maaaring tanggalin'
  },

  member: {
    notFound: 'Hindi mahanap ang miyembro',
    passwordInvalid: 'Hindi nakakatugon sa mga kinakailangan ang password, dapat na nasa pagitan ng 8-20 karakter ang haba ng password, at dapat naglalaman ng mga titik at numero',
    groupByIdNotFound: 'Hindi mahanap ang Grupo ID {parsedGroupId}',
    groupLimit: 'Umabot na sa limitasyon ({maxMembers} na tao) ang bilang ng mga miyembro ng grupo (ID:{parsedGroupId})',
    accountExists: 'Umiiral na ang account ng miyembro',
    groupNotFound: 'Hindi mahanap ang grupo',
    inviterNotFound: 'Hindi mahanap ang taga-anyaya',
    accountUsed: 'Ginamit na ng ibang miyembro ang account',
    associatedAccount: 'May mga nauugnay na account sa miyembro na ito, hindi maaaring tanggalin',
    associatedTask: 'May mga nauugnay na gawain sa miyembro na ito, hindi maaaring tanggalin',
    associatedBill: 'May mga nauugnay na bill sa miyembro na ito, hindi maaaring tanggalin',
    rewardAmountInvalid: 'Ang halaga ng gantimpala ay dapat na higit sa 0',
    deductAmountInvalid: 'Ang halaga ng kaltas ay dapat na higit sa 0'
  },

  submittedTask: {
    notFound: 'Hindi mahanap ang isinumiteng rekord',
    approveSuccess: 'Matagumpay na naaprubahan ang {updatedCount} na gawain',
    rejectSuccess: 'Matagumpay na tinanggihan ang {updatedCount} na gawain',
    preApproveSuccess: 'Matagumpay na nauna nang naaprubahan ang {updatedCount} na gawain',
    preRejectSuccess: 'Matagumpay na nauna nang tinanggihan ang {updatedCount} na gawain'
  },

  task: {
    notFound: 'Hindi mahanap ang gawain'
  },

  waiter: {
    usernameExists: 'Umiiral na ang username',
    notFound: 'Hindi mahanap ang waiter',
    notAllowedDeleteAdmin: 'Hindi pinapayagan na tanggalin ang account ng administrator'
  },

  withdrawal: {
    noWithdrawalsResolve: 'Nabigo ang batch na pagsusuri, walang natutugunan ang mga kondisyon na aplikasyon para sa pag-withdraw',
    noWithdrawalsReject: 'Nabigo ang batch na pagtanggi, walang natutugunan ang mga kondisyon na aplikasyon para sa pag-withdraw'
  }
}; 