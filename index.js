function createLib(execlib) {
  'use strict';
  var AppSuite = require('./appcreator')(execlib);

  function createApp(desc) {
    return new App(desc);
  }

  return {
    createApp: createApp
  };
}

module.exports = createLib;
