function createAppJobCoreBase (lib, mylib) {
  'use strict';

  function AppJobCoreBase (app) {
    this.app = app;
    this.finalResult = void 0;
  }
  AppJobCoreBase.prototype.destroy = function () {
    this.finalResult = null;
    this.app = null;
  };
  AppJobCoreBase.prototype.shouldContinue = function () {
    if (lib.defined(this.finalResult)) {
      return this.finalResult;
    }
    if(!this.app) {
      throw new lib.Error('NO_APP', this.constructor.name+' needs to have app');
    }
    if (!this.app.environments) {
      throw new lib.Error('NO_APP.ENVIRONMENTS', this.constructor.name+' holds an app that is already destroyed');
    }
  };
  
  mylib.Base = AppJobCoreBase;
}
module.exports = createAppJobCoreBase;