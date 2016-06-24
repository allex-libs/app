function createAppLib (lib) {
  'use strict';
  return {
    DataSource : require('./cDataSource')(lib),
    Command : require('./cCommand')(lib)
  };
}

return createAppLib;
