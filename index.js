function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    Elements = require('./elements')(lib, Hierarchy),
    App = require('./app/cApp')(lib, Elements.BasicElement, Hierarchy);

  function createApp(desc) {
    return new App(desc);
  }

  return {
    createApp: createApp,
    registerElementType : Elements.registerElementType,
    BasicElement : Elements.BasicElement
  };
}

module.exports = createLib;
