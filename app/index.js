function createAppLib (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, descriptorapi, arryopslib) {
  'use strict';
  return require('./appcreator')(lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, descriptorapi, arryopslib);
}

module.exports = createAppLib;
