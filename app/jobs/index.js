function createAppJobs (lib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers, descriptorapi, arryopslib) {
  'use strict';

  var AppJob = require('./appjobcreator')(lib),
    AppJobCore = require('./appjobcorecreator')(lib),
    descarryprocessingcoreslib = require('./descarrayprocessingcores')(lib, dataSuite, Resources, environtmentFactory, BasicElement, descriptorapi, arryopslib),
    DescriptorLoaderJob = require('./descriptorloaderjobcreator')(lib, AppJobCore, descarryprocessingcoreslib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers);

  return {
    AppJob: AppJob,
    DescriptorLoaderJob: DescriptorLoaderJob
  };
}

module.exports = createAppJobs;
