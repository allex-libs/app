function createDataSource (lib) {
  'use strict';

  var CLDestroyable = lib.CLDestroyable;

  function AppSideDataSource (source_name) {
    CLDestroyable.call(this);
    this.should_running = false;
    this.running = false;
    this.source_name = source_name;
    this.data = null;
    this.environment = null;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
    this.should_running = null;
    this.running = null;
    this.environment = null;
    this.source_name = null;
    this.data = null;
    CLDestroyable.prototype.__cleanUp.call(this);
  };


  AppSideDataSource.prototype.set_environment = function (val) {
    var should_running = this.should_running;
    if (this.environment) {
      this.stop();
    }
    this.should_running = should_running;
    this.environment = val;

    if (!this.environment) return;
    if (this.should_running) {
      this.start();
    }
  };

  AppSideDataSource.prototype.stop = function () {
    this.should_running = false;
    if (this.environment) {
      this.environment.stopDataSource(this.source_name, this);
      this.set('running', false);
    }
  };

  AppSideDataSource.prototype.start = function () {
    this.should_running = true;
    if (this.environment) {
      this.environment.startDataSource(this.source_name, this);
      this.set('running', true);
    }
  };

  return AppSideDataSource;
}

module.exports = createDataSource;
