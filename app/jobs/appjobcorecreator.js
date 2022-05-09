function createAppJobCore (lib) {
  'use strict';

  function AppJobCore (app) {
    this.app = app;
  }
  AppJobCore.prototype.destroy = function () {
    this.app = null;
  };
  AppJobCore.prototype.shouldContinue = function () {
    if (!this.app) {
      return new lib.Error('ALREADY_DESTROYED', 'This instance of'+this.constructor.name+' is already destroyed');
    }
    if (!this.app.environments) {
      return new lib.Error('APP_ALREADY_DESTROYED', 'App '+this.app.constructor.name+' is already destroyed');
    }
  };

  return AppJobCore;
}
module.exports = createAppJobCore;