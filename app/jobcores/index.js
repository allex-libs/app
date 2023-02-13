function createJobCores (lib) {
  'use strict';

  var mylib = {};

  require('./basecreator')(lib, mylib);
  require('./querypropertiescreator')(lib, mylib);

  return mylib;
}
module.exports = createJobCores;