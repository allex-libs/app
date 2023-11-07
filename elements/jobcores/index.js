function createBasicElementJobCores(lib, Resources, DescriptorHandler, Linker, jobs) {
  'use strict';
  var mylib = {};

  require('./basecreator')(lib, mylib);
  require('./elementsloadercreator')(lib, DescriptorHandler, mylib);
  require('./initializercreator')(lib, DescriptorHandler, Linker, jobs, mylib);

  return mylib;
}
module.exports = createBasicElementJobCores;