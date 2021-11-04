function createElementLoaderJob (lib, JobOnDestroyable, Resources, DescriptorHandler) {
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
    var ok = this.okToGo(), resreqs, resdescs, promises, p, intenvdesc;
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
    if (!this.destroyable.integrationEnvironment) {
      intenvdesc = this.destroyable.createIntegrationEnvironmentDescriptor(this.destroyable.myNameOnMasterEnvironment());
      if (intenvdesc) {
        promises.push(this.loadIntegrationEnvironment(intenvdesc));
      }
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

  ElementLoaderJob.prototype.loadIntegrationEnvironment = function (intenvdesc) {
    var pktp = this.peekToProceed(), env;
    if (!pktp.ok) {
      return pktp.val;
    }
    env = new DescriptorHandler(intenvdesc);
    return env.load().then(
      this.onIntegrationEnvironment.bind(this),
      this.onIntegrationEnvironmentFailed.bind(this)
    );
  };
  ElementLoaderJob.prototype.onIntegrationEnvironment = function (result) {
    this.destroyable.integrationEnvironment = result;
    return result;
  };
  ElementLoaderJob.prototype.onIntegrationEnvironmentFailed = function (reason) {
    console.error(reason);
    throw reason;
  };

  ElementLoaderJob.prototype.fireLoadEvent = function () {
    var pktp = this.peekToProceed();
    if (!pktp.ok) {
      return pktp.val;
    }
  };


  function resourceLoader (resource) {
    console.log('got resource', resource, 'will load it');
    return resource.load().then(qlib.returner(resource));
  }

  return ElementLoaderJob;
}

module.exports = createElementLoaderJob;
