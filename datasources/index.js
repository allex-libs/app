function createDataSourceRegistry (execlib) {
  'use strict';
  var AllexState = require('./allexstatecreator')
    AllexHash2Array = require('./hash2arraycreator')(execlib);

  return {
    AllexState: AllexState,
    AllexHash2Array: AllexHash2Array
  };
}

module.exports = createDataSourceRegistry;
