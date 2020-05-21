function createMixins (lib) {
  'use strict';

  var ret = {};
  require('./linksandlogicdestroyablecreator')(lib, ret);
  require('./neededconfigurationnamescreator')(lib, ret);

  require('./childactualizercreator')(lib, ret);
  require('./formcreator')(lib, ret);
  return ret;
}

module.exports = createMixins;
