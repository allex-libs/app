function createDescriptorArrayProcessingCores (lib, dataSuite, Resources, environtmentFactory, BasicElement, descriptorapi, arryopslib) {
  'use strict';
  var mylib = {};

  require('./basecreator')(lib, mylib);
  require('./environmentscreatorcreator')(lib, environtmentFactory, mylib);
  require('./elementscreatorcreator')(lib, BasicElement, descriptorapi, mylib);
  require('./datasourcescreatorcreator')(lib, dataSuite, arryopslib, mylib);
  require('./commandsscreatorcreator')(lib, dataSuite, arryopslib, mylib);
  require('./resourcesloadercreator')(lib, Resources, mylib);

  return mylib;
}
module.exports = createDescriptorArrayProcessingCores;