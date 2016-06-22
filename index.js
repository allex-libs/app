function createLib(execlib) {
  'use strict';
  var UserRepresentation = require('./userrepresentationcreator')(execlib),
    createApp = require('./appcreator')(execlib, UserRepresentation);

  return {
    createApp: createApp
  };
}

module.exports = createLib;
