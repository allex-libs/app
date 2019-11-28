function createElementJobs (lib, jobondestroyablelib, Resources) {
  'use strict';

  var JobOnDestroyable = jobondestroyablelib.JobOnDestroyable;

  return {
    ElementLoaderJob : require('./elementloadercreator')(lib, JobOnDestroyable, Resources),
    ElementUnloaderJob : require('./elementunloadercreator')(lib, JobOnDestroyable, Resources)
  };

}

module.exports = createElementJobs;
