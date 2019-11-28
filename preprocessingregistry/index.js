function createPreProcessingRegistries (lib, mixins) {
  'use strict';

  var plib = require('./basecreator')(lib, mixins.NeededConfigurationNamesMixin),
    BasicProcessor = plib.BasicProcessor,
    RegistryBase = plib.PreProcessingRegistry;

  return {
    _doProcess: plib._doProcess,
    BasicProcessor: BasicProcessor,
    PreProcessors: require('./preprocessingregistrycreator.js')(lib, plib.PreProcessingRegistryBase),
    PrePreProcessors: require('./prepreprocessingregistrycreator')(lib, plib.PreProcessingRegistryBase)
  };
}

module.exports = createPreProcessingRegistries;
