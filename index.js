function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    BasicParent = require('./abstractions/cBasicParent')(lib, Hierarchy),
    Elements = require('./elements')(lib, Hierarchy, BasicParent),
    Resources = require('./resources')(lib),
    App = require('./app/cApp')(lib, Elements.BasicElement, Hierarchy, Resources, BasicParent);

  function createApp(desc, pagector) {
    if (RESULT.App) throw new Error("You're not allowed to create more than one App");
    var ret = new App(desc, pagector);
    RESULT.App = ret;
    return ret;
  }

  var RESULT = {
    createApp: createApp,
    registerElementType : Elements.registerElementType,
    BasicElement : Elements.BasicElement,
    registerResourceType : Resources.registerResourceType,
    BasicResourceLoader : Resources.BasicResourceLoader,
    getResource : Resources.getResource,
    resourceFactory: Resources.resourceFactory,
    App : null
  };

  return RESULT;
}

module.exports = createLib;
