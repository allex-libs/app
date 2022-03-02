function createElementJobs (lib, Resources, DescriptorHandler) {
  'use strict';

  var JobOnDestroyable = lib.qlib.JobOnDestroyable;

  var ret = {};

  require('./environmentloadingcreator')(lib, DescriptorHandler, ret);
  require('./elementloadercreator')(lib, JobOnDestroyable, Resources, DescriptorHandler, ret);
  require('./elementunloadercreator')(lib, JobOnDestroyable, Resources, ret);

  return ret;
}

module.exports = createElementJobs;
