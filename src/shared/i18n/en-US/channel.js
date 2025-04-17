module.exports = {
  validation: {
    keywordString: 'Keyword must be a string',
    idNotEmpty: 'Channel ID cannot be empty',
    idInt: 'Channel ID must be an integer',
    nameNotEmpty: 'Channel name cannot be empty',
    nameLength: 'Channel name length cannot exceed 50 characters',
    iconNotEmpty: 'Channel icon cannot be empty',
    customFieldsArray: 'customFields must be an array'
  },

  common: {
    nameExists: 'Channel name already exists',
    associatedAccounts: 'The channel has associated accounts and cannot be deleted',
    associatedTasks: 'The channel has associated tasks and cannot be deleted'
  },

  admin: {
    channelNotFound: 'Channel not found',
    idNotEmpty: 'Channel ID cannot be empty',
  }
}