function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    BasicParent = require('./abstractions/cBasicParent')(lib, Hierarchy),
    Linker = execlib.execSuite.libRegistry.get('allex_applinkinglib'),
    Resources = require('./resources')(lib),
    Modifier = require('./modifiers')(execlib),
    Elements = require('./elements')(lib, Hierarchy, BasicParent,Linker, Resources, Modifier.executeModifiers),
    App = require('./app/cApp')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, execlib.execSuite.libRegistry.get('allex_environmentlib'), Linker, Elements.BasicElement),
    PreProcessor = require('./preprocessor.js')(lib);

  function createApp(desc, pagector) {
    if (RESULT.App) throw new Error("You're not allowed to create more than one App");
    PreProcessor.process(desc);
    var ret = new App(desc, pagector);
    RESULT.App = ret;
    return ret;
  }

  var RESULT = {
    registerModifier : Modifier.registerModifier,
    BasicModifier : Modifier.BasicModifier,
    registerPreprocessor : PreProcessor.registerPreprocessor,
    BasicProcessor : PreProcessor.BasicProcessor,
    createApp: createApp,
    registerElementType : Elements.registerElementType,
    BasicElement : Elements.BasicElement,
    registerResourceType : Resources.registerResourceType,
    BasicResourceLoader : Resources.BasicResourceLoader,
    App : null
  };

  return RESULT;
}

module.exports = createLib;
