function createAppJobs (lib, jobondestroyablelib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers) {
  'use strict';

  var AppJob = require('./appjobcreator')(lib, jobondestroyablelib),
    DescriptorLoaderJob = require('./descriptorloaderjobcreator')(lib, AppJob, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers);

  return {
    AppJob: AppJob,
    DescriptorLoaderJob: DescriptorLoaderJob
  };
}

module.exports = createAppJobs;
