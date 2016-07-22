function createDataSource (lib) {
  'use strict';

  var CLDestroyable = lib.CLDestroyable;

  function AppSideDataSource (source_name) {
    CLDestroyable.call(this);
    this.should_running = true;
    this.running = false;
    this.source_name = source_name;
    this.data = null;
    this.environment = null;
    this._esl = null;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
    if (this._esl) this._esl.destroy();
    this._esl = null;
    this.should_running = null;
    this.running = null;
    this.environment = null;
    this.source_name = null;
    this.data = null;
    CLDestroyable.prototype.__cleanUp.call(this);
  };

  //TODO: ovde sad treba jos da se radi ... kad se env ukaci, prevezi data source - ove ...
  AppSideDataSource.prototype._processShouldRunning  = function () {
    if (this.should_running) {
      this.start()
    }else{
      this.stop();
    }
  };

  AppSideDataSource.prototype.set_should_running = function (val) {
    if (val === this.should_running) return false;
    this._processShouldRunning(val);
    return true;
  };

  AppSideDataSource.prototype.set_data = function (val) {
    if (this.data === val) return false;
    this.data = val;
    return true;
  };


  AppSideDataSource.prototype.set_environment = function (val) {
    if (this.environment === val) return false;
    if (this._esl) this._esl.destroy();
    this._esl = null;
    this._unbindDS();
    this.environment = val;
    if (!val) return true; //nothing to be done ...

    this._esl = this.environment.attachListener ('state', this._onEnvStateChanged.bind(this));
    this._onEnvStateChanged(this.environment.state);
    return true;
  };

  AppSideDataSource.prototype._onEnvStateChanged = function (state) {
    if (!this.environment.isEstablished()) return this._unbindDS();
    this._processShouldRunning();
  };

  AppSideDataSource.prototype._bindToDS = function () {
    if (!this.environment || !this.environment.isEstablished()) return;
    this.environment.dataSources.get(this.source_name).setTarget(this);
    this.set('running', true);
  };

  AppSideDataSource.prototype._unbindDS = function () {
    if (!this.environment || !this.environment.isEstablished()) return;
    this.environment.dataSources.get(this.source_name).setTarget(null);
    this.set('running', false);
  };

  AppSideDataSource.prototype.stop = function () {
    this.should_running = false;
    this._unbindDS();
  };

  AppSideDataSource.prototype.start = function () {
    this.should_running = true;
    this._bindToDS();
  };

  return AppSideDataSource;
}

module.exports = createDataSource;
