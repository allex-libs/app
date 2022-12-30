function createElementUnloaderJob (lib, JobOnDestroyable, Resources, mylib) {
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
    if (this.destroyable.loadedEnvironment && this.destroyable.loadedEnvironment.dynamic) {
      this.destroyable.loadedEnvironment.dynamic.destroy();
      this.destroyable.loadedEnvironment.dynamic = null;
    }
    var promises = lib.isArray(this.destroyable.resourcereqs)
      ?
      this.destroyable.resourcereqs.map(this.unloadResourceReq.bind(this))
      :
      [];
    if (lib.isArray(this.destroyable.resources)) {
      promises.concat(this.destroyable.resources.map(this.unloadResource.bind(this)));
    }
    q.all(promises).then(
      this.finalStep.bind(this),
      this.reject.bind(this)
    );
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

  ElementUnloaderJob.prototype.finalStep = function (resultuptonow) {
    if (!this.okToProceed()){
      return;
    }
    if (this.destroyable) {
      try {
        if (this.destroyable.loadedEnvironment.dynamic) {
          this.destroyable.loadedEnvironment.dynamic.destroy();
          this.destroyable.loadedEnvironment.dynamic = null;
        }
        this.destroyable.onUnloaded();
      } catch (e) {
        console.error('Unload finalizing produced an error', e);
        this.reject(e)
      }
    }
    this.resolve(resultuptonow);
  };

  ElementUnloaderJob.prototype.fireLoadEvent = function () {
    if (!this.peekToProceed()) {
      return;
    }
    this.destroyable.loadEvent.fire.apply(this.destroyable, arguments);
  };

  mylib.ElementUnloaderJob = ElementUnloaderJob;
}

module.exports = createElementUnloaderJob;
