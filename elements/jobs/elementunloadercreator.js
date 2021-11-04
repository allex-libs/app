function createElementUnloaderJob (lib, JobOnDestroyable, Resources) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;

  function ElementUnloaderJob (el, defer) {
    JobOnDestroyable.call (this, el, defer);
  }
  lib.inherit(ElementUnloaderJob, JobOnDestroyable);
  ElementUnloaderJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    var promises = lib.isArray(this.destroyable.resourcereqs)
      ?
      this.destroyable.resourcereqs.map(this.unloadResourceReq.bind(this))
      :
      [];
    if (lib.isArray(this.destroyable.resources)) {
      promises.concat(this.destroyable.resources.map(this.unloadResource.bind(this)));
    }
    if (this.destroyable.integrationEnvironment) {
      this.destroyable.integrationEnvironment.destroy();
    }
    this.destroyable.integrationEnvironment = null;
    qlib.promise2defer(q.all(promises), this);
    return ok.val;
  };

  ElementUnloaderJob.prototype.unloadResourceReq = function (resourcename) {
    if (!this.peekToProceed()) {
      return q(null);
    }
    var resource = Resources.get(resourcename.resource || resourcename);
    if (resource) {
      resource.unload();
    }
    return q(true);
  };

  ElementUnloaderJob.prototype.unloadResource = function (resourcename) {
    console.log('how to unloadResource', resourcename, '?');
    throw new Error('blah, sort this out');
  };

  ElementUnloaderJob.prototype.fireLoadEvent = function () {
    if (!this.peekToProceed()) {
      return;
    }
    this.destroyable.loadEvent.fire.apply(this.destroyable, arguments);
  };

  return ElementUnloaderJob;
}

module.exports = createElementUnloaderJob;
