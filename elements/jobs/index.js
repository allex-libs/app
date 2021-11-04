function createElementJobs (lib, Resources, DescriptorHandler) {
  'use strict';

  var JobOnDestroyable = lib.qlib.JobOnDestroyable;

  return {
    ElementLoaderJob : require('./elementloadercreator')(lib, JobOnDestroyable, Resources, DescriptorHandler),
    ElementUnloaderJob : require('./elementunloadercreator')(lib, JobOnDestroyable, Resources)
  };

}

module.exports = createElementJobs;
