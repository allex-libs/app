function createAllexStateDataSource (execlib) {
  'use strict';

  function AllexState (sink, name) {
    console.log('new AllexState', sink, name);
    if (!sink) {
      throw new lib.Error('NO_SINK');
    }
    if (!name) {
      throw new lib.Error('NO_STATE_NAME');
    }
    var h = {};
    h[name] = this.onState.bind(this);
    console.log('monitorStateForGui on', sink);
    sink.monitorStateForGui(h);
  }
  AllexState.prototype.destroy = function () {
  };
  AllexState.prototype.onState = function () {
    console.log('onState', arguments);
  };

  return AllexState;
}

module.exports = createAllexStateDataSource;
