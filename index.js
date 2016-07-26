function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    BasicParent = require('./abstractions/cBasicParent')(lib, Hierarchy),
    Linker = execlib.execSuite.libRegistry.get('allex_applinkinglib'),
    Resources = require('./resources')(lib),
    Elements = require('./elements')(lib, Hierarchy, BasicParent,Linker, Resources),
    App = require('./app/cApp')(lib, Elements, Hierarchy, Resources, BasicParent, execlib.execSuite.libRegistry.get('allex_environmentlib'), Linker, Elements.BasicElement);

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
    traverseResources : Resources.traverseResources,
    App : null
  };

  return RESULT;
}

module.exports = createLib;
