function createMixins (lib) {
  'use strict';

  var ret = {};
  require('./linksandlogicdestroyablecreator')(lib, ret);
  require('./neededconfigurationnamescreator')(lib, ret);
  require('./dataupdatercreator')(lib, ret);
  require('./dataelementcreator')(lib, ret);
  require('./dataelementfollowercreator')(lib, ret);
  require('./formcreator')(lib, ret);
  return ret;
}

module.exports = createMixins;
