function createPreProcessingRegistries (lib) {
  'use strict';

  var plib = require('./basecreator')(lib),
    BasicProcessor = plib.BasicProcessor,
    RegistryBase = plib.PreProcessingRegistry;

  return {
    BasicProcessor: BasicProcessor,
    PreProcessors: require('./preprocessingregistrycreator.js')(lib, plib.PreProcessingRegistryBase),
    PrePreProcessors: require('./prepreprocessingregistrycreator')(lib, plib.PreProcessingRegistryBase)
  };
}

module.exports = createPreProcessingRegistries;
