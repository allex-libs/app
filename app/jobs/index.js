function createAppJobs (lib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers) {
  'use strict';

  var AppJob = require('./appjobcreator')(lib),
    DescriptorLoaderJob = require('./descriptorloaderjobcreator')(lib, AppJob, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers);

  return {
    AppJob: AppJob,
    DescriptorLoaderJob: DescriptorLoaderJob
  };
}

module.exports = createAppJobs;
