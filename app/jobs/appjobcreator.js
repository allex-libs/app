function createAppJob (lib, jobondestroyablelib) {
  'use strict';

  var JobOnDestroyableBase = jobondestroyablelib.JobOnDestroyableBase;

  function AppJob (app, defer) {
    JobOnDestroyableBase.call(this, app, defer);
  }
  lib.inherit(AppJob, JobOnDestroyableBase);
  AppJob.prototype.destroy = function () {
    this.app = null;
    JobOnDestroyableBase.prototype.destroy.call(this);
  };
  AppJob.prototype._destroyableOk = function () {
    return this.destroyable && this.destroyable.environments;
  };

  return AppJob;
}

module.exports = createAppJob;
