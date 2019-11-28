function createElementLoaderJob (lib, JobOnDestroyable, Resources) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;

  function ElementLoaderJob (el, defer) {
    JobOnDestroyable.call (this, el, defer);
  }
  lib.inherit(ElementLoaderJob, JobOnDestroyable);
  ElementLoaderJob.prototype.destroy = function () {
    JobOnDestroyable.prototype.destroy.call(this);
  };
  ElementLoaderJob.prototype.resolve = function (thingy) {
    this.fireLoadEvent(true);
    JobOnDestroyable.prototype.resolve.call(this, thingy);
  };
  ElementLoaderJob.prototype.go = function () {
    var ok = this.okToGo(), resreqs, resdescs, promises, p;
    if (!ok.ok) {
      return ok.val;
    }
    promises = [];
    resreqs = this.destroyable.resourcereqs;
    resdescs = this.destroyable.resourcedescs;
    this.destroyable.resourcereqs = null;
    this.destroyable.resourcedescs = null;
    
    if (lib.isArray(resreqs)) {
      promises.push.apply(promises, resreqs.map(this.getResource.bind(this)));
    }
    if (lib.isArray(resdescs)) {
      promises.push.apply(promises, resdescs.map(this.loadResourceParams.bind(this)));
    }
    p = q.all(promises);
    qlib.promise2defer(p, this);
    return ok.val;
  };

  ElementLoaderJob.prototype.getResource = function (resourcename) {
    var pktp = this.peekToProceed(), resourceid, p;
    if (!pktp.ok) {
      return pktp.val;
    }
    resourceid = resourcename.resource || resourcename;
    console.log('will waitForResource', resourceid); 
    p = Resources.waitForResource(resourceid).then(resourceLoader);
    p.then(this.doUpdateResource.bind(this, resourcename), null, this.fireLoadEvent.bind(this));
    return p;
  };

  ElementLoaderJob.prototype.loadResourceParams = function (resourcename) {
    var pktp = this.peekToProceed();
    if (!pktp.ok) {
      return pktp.val;
    }
    console.log('loadResource?', resourcename);
    Resources.loadResourceParams(resourcename);
    return q({});
  };

  ElementLoaderJob.prototype.doUpdateResource = function (resourcename) {
    var pktp = this.peekToProceed();
    if (!pktp.ok) {
      return pktp.val;
    }
    this.destroyable.updateResource(resourcename);
  };

  ElementLoaderJob.prototype.fireLoadEvent = function () {
    var pktp = this.peekToProceed();
    if (!pktp.ok) {
      return pktp.val;
    }
    this.destroyable.loadEvent.fire.apply(this.destroyable.loadEvent, arguments);
  };


  function resourceLoader (resource) {
    console.log('got resource', resource, 'will load it');
    return resource.load().then(qlib.returner(resource));
  }

  return ElementLoaderJob;
}

module.exports = createElementLoaderJob;
