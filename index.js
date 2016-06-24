function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    App = require('./appcreator')(execlib),
    Elements = require('./elements');

  function createApp(desc) {
    return new App(desc, elementFactory);
  }

  return {
    createApp: createApp,
    registerElementType : Elements.registerElementType
  };
}

module.exports = createLib;
