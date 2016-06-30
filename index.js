function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    Elements = require('./elements')(lib, Hierarchy),
    Resources = require('./resources')(lib),
    App = require('./app/cApp')(lib, Elements.BasicElement, Hierarchy, Resources);

  function createApp(desc, pagector) {
    return new App(desc, pagector);
  }

  return {
    createApp: createApp,
    registerElementType : Elements.registerElementType,
    BasicElement : Elements.BasicElement,
    registerResourceType : Resources.registerResourceType,
    BasicResourceLoader : Resources.BasicResourceLoader,
    getResource : Resources.getResource
  };
}

module.exports = createLib;
