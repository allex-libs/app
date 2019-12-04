function createElementJobs (lib, Resources) {
  'use strict';

  var JobOnDestroyable = lib.qlib.JobOnDestroyable;

  return {
    ElementLoaderJob : require('./elementloadercreator')(lib, JobOnDestroyable, Resources),
    ElementUnloaderJob : require('./elementunloadercreator')(lib, JobOnDestroyable, Resources)
  };

}

module.exports = createElementJobs;
