function createDataMixins (lib, elements, datafilterslib, mixins) {
  'use strict';

  require('./dataupdatercreator')(lib, mixins);
  require('./dataelementcreator')(lib, mixins);
  require('./dataelementfollowercreator')(lib, mixins);
  require('./fromdatacreator')(lib, elements, datafilterslib, mixins);
}
module.exports = createDataMixins;
