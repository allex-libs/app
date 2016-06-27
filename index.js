function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    App = require('./app/cApp')(execlib),
    Elements = require('./elements');

  function createApp(desc) {
    return new App(desc);
  }

  return {
    createApp: createApp,
    registerElementType : Elements.registerElementType
  };
}

module.exports = createLib;
