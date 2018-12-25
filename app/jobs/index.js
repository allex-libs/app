function createAppJobs (lib, jobondestroyablelib, dataSuite, Resources, EnvironmentFactoryPromise, BasicElement, executeModifiers) {
  'use strict';

  var AppJob = require('./appjobcreator')(lib, jobondestroyablelib),
    DescriptorLoaderJob = require('./descriptorloaderjobcreator')(lib, AppJob, dataSuite, Resources, EnvironmentFactoryPromise, BasicElement, executeModifiers);

  return {
    AppJob: AppJob,
    DescriptorLoaderJob: DescriptorLoaderJob
  };
}

module.exports = createAppJobs;
