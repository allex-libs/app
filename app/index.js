function createAppLib (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor) {
  'use strict';
  return require('./appcreator')(lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor);
}

module.exports = createAppLib;
