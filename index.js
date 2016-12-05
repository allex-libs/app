function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    BasicParent = require('./abstractions/cBasicParent')(lib, Hierarchy),
    Linker = execlib.execSuite.libRegistry.get('allex_applinkinglib'),
    Resources = require('./resources')(lib),
    misc = require('./misc')(lib),
    Modifier = require('./modifiers')(execlib, misc),
    Elements = require('./elements')(lib, Hierarchy, BasicParent,Linker, Resources, Modifier.executeModifiers),
    App = require('./app/cApp')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, execlib.execSuite.libRegistry.get('allex_environmentlib'), Linker, Elements.BasicElement, Modifier.executeModifiers),
    PreProcessor = require('./preprocessor.js')(lib);

  function createApp(desc, pagector) {
    if (RESULT.App) throw new Error("You're not allowed to create more than one App");
    PreProcessor.process(desc);
    var ret = new App(desc, pagector);
    RESULT.App = ret;
    if (lib.isFunction (desc.onAppCreated)) {
      ret.onReady(desc.onAppCreated.bind(null, ret));
    }
    return ret;
  }

  Elements.registerElementType ('BasicElement', Elements.BasicElement);

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
    App : null,
    misc : misc
  };

  return RESULT;
}

module.exports = createLib;
