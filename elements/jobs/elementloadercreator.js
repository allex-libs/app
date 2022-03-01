function createElementLoaderJob (lib, JobOnDestroyable, Resources, DescriptorHandler, mylib) {
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
    if (this.destroyable) {
      try {
        this.destroyable.onLoaded();
      } catch(e) {
        this.reject(e);
        return;
      }
    }
    JobOnDestroyable.prototype.resolve.call(this, thingy);
  };
  ElementLoaderJob.prototype.reject = function (reason) {
    if (this.destroyable.id) {
      console.error('Element loading failed for', this.destroyable.id, this.destroyable.constructor.name);
      console.error(reason);
    }
    JobOnDestroyable.prototype.reject.call(this, reason);
  };
  ElementLoaderJob.prototype.go = function () {
    var ok = this.okToGo(), resreqs, resdescs, promises, p, intenvdesc;
    if (!ok.ok) {
      return ok.val;
    }
    this.destroyable.set('loading', true);
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
    if (this.destroyable.createIntegrationEnvironmentDescriptor) {
      console.error(this.destroyable.constructor.name, 'has to move createIntegrationEnvironmentDescriptor to actualEnvironmentDescriptor')
      lib.runNext(this.reject.bind(this, new lib.Error('IMPLEMENTATION_OBSOLETE', 'createIntegrationEnvironmentDescriptor is obsolete')));
      return;
    }
    if (this.destroyable.lateElementDescriptors) {
      console.error(this.destroyable.constructor.name, 'has to move lateElementDescriptors to actualElementDescriptors')
      lib.runNext(this.reject.bind(this, new lib.Error('IMPLEMENTATION_OBSOLETE', 'lateElementDescriptors is obsolete')));
      return;
    }
    /*
    if (!this.destroyable.integrationEnvironment) {
      try {
        intenvdesc = this.destroyable.actualEnvironmentDescriptor(this.destroyable.myNameOnMasterEnvironment());
        if (intenvdesc) {
          promises.push(this.loadIntegrationEnvironment(intenvdesc));
        }
      } catch (e) {
        console.error('loadIntegrationEnvironment failed', e);
        lib.runNext(this.reject.bind(this, e));
        return ok.val;
      }
    }
    */
    p = q.all(promises);
    //qlib.promise2defer(p, this);
    /*
    p.then(
      this.createLateElements.bind(this),
      this.reject.bind(this)
    );
    */
    p.then(
      this.loadDynamicElementsAndEnvironment.bind(this),
      this.reject.bind(this)
    )
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
    p.then(this.doUpdateResource.bind(this, resourcename), null, null);
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

  ElementLoaderJob.prototype.createLateElements = function (resultuptonow) {
    var lateelemdescs;
    if (!this.okToProceed()) {
      return;
    }
    if (!this.destroyable.lateElementsCreated) {
      lateelemdescs = this.destroyable.actualElementDescriptors();
      if (lib.isArray(lateelemdescs)) {
        q.all(lateelemdescs.map(this.createLateElement.bind(this))).then(
          this.onLateElementsCreated.bind(this, resultuptonow),
          this.reject.bind(this)
        );
        return;
      }
    }
    this.resolve(resultuptonow);
  };
  ElementLoaderJob.prototype.createLateElement = function (lateelemdesc) {
    var elem = this.destroyable.createElement(lateelemdesc), d = q.defer(), ret = d.promise;
    if (lateelemdesc && lateelemdesc.options && lateelemdesc.options.actual) {
      elem.loadEvent.attachForSingleShot(elemLoaded.bind(null, d));
      d = null;
      return ret;
    }
    d.resolve(elem);
    return ret;
  };
  function elemLoaded (defer, elem) {
    defer.resolve(elem);
  }
  ElementLoaderJob.prototype.onLateElementsCreated = function (firststageresult, lateelemsresult) {
    if (!this.okToProceed()) {
      return;
    }
    this.destroyable.lateElementsCreated = true;
    this.resolve(firststageresult.concat(lateelemsresult));
  };

  ElementLoaderJob.prototype.loadDynamicElementsAndEnvironment = function (resultuptonow) {
    if (!this.okToProceed()) {
      return;
    }
    (new mylib.LoadActualElementsAndEnvironment(this.destroyable)).go().then(
      this.resolve.bind(this, resultuptonow),
      this.reject.bind(this)
    );
  };

  function resourceLoader (resource) {
    console.log('got resource', resource, 'will load it');
    return resource.load().then(qlib.returner(resource));
  }

  mylib.ElementLoaderJob = ElementLoaderJob;
}

module.exports = createElementLoaderJob;
