function createAppLib (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, jobondestroyablelib) {
  'use strict';
  return require('./appcreator')(lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, jobondestroyablelib);
}

module.exports = createAppLib;
