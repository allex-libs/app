function createPreProcessors (lib, preprocessingregistrylib, descriptorApi) {
  'use strict';

  var EnvironmentHelperPreprocessor = require('./environmenthelpercreator')(lib, preprocessingregistrylib, descriptorApi);

  require('./datasourcecreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./datacommandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./commandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);

}

module.exports = createPreProcessors;
