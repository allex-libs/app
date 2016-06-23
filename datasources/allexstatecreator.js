function createAllexStateDataSource (execlib) {
  'use strict';

  function AllexState (sink, name) {
    if (!sink) {
      throw new lib.Error('NO_SINK');
    }
    if (!name) {
      throw new lib.Error('NO_STATE_NAME');
    }
  }

  return AllexState;
}

module.exports = createAllexStateDataSource;
