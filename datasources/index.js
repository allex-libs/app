function createDataSourceRegistry (execlib) {
  'use strict';
  var AllexState = require('./allexstatecreator')(execlib),
    AllexHash2Array = require('./allexhash2arraycreator')(execlib, AllexState);

  return {
    AllexState: AllexState,
    AllexHash2Array: AllexHash2Array
  };
}

module.exports = createDataSourceRegistry;
