function createAllexEnvironment (execlib, dataSourceRegistry, EnvironmentBase) {
  'use strict';

  var lib = execlib.lib;
  
  function AllexEnvironment (options) {
    EnvironmentBase.call(this, options);
  }
  lib.inherit (AllexEnvironment, EnvironmentBase);
  AllexEnvironment.prototype.createDataSource = function (type, options) {
    var ctor;
    if (options.sink) {
      throw new lib.JSONizingError('NO_SINK_DESCRIPTION', options, 'No sink description:');
    }
    switch (type) {
      case 'allexstate':
        ctor = dataSourceRegistry.AllexState;
      case 'allexhash2array':
        ctor = dataSourceRegistry.AllexHash2Array;
      default:
        throw new lib.Error('DATASOURCE_TYPE_NOT_APPLICABLE_TO_ALLEX_ENVIRONMENT', type);
    }
  };
  AllexEnvironment.prototype.createCommand = function (options) {
  };

  return AllexEnvironment;
}

module.exports = createAllexEnvironment;
