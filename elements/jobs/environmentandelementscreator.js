function createEnvironmentAndElementsFunctionality (lib, DescriptorHandler, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    SteppedJobOnSteppedInstance = qlib.SteppedJobOnSteppedInstance;

  function EnvironmentAndElements () {
    this.envLoader = null;
    this.elements = [];
  }
  EnvironmentAndElements.prototype.destroy = function () {
    if (this.envLoader) {
      this.envLoader.destroy();
    }
    this.envLoader = null;
    if (lib.isArray(this.elements)) {
      lib.arryDestroyAll(this.elements);
    }
    this.elements = null;
  }

  function LoadEnvironmentAndElementsJobCore (elem) {
    this.elem = elem;
    this.envAndElements = new EnvironmentAndElements();
    this.envDesc = null;
    this.elemDescs = null;
  }
  LoadEnvironmentAndElementsJobCore.prototype.destroy = function () {
    this.elemDescs = null;
    this.envDesc = null;
    this.envAndElements = null;
    this.elem = null;
  };
  LoadEnvironmentAndElementsJobCore.prototype.shouldContinue = function () {
    if (this.elem && this.elem.destroyed) {
      return;
    }
    return new lib.Error('ELEMENT_DESTROYED', 'No Element to load Environment and Elements on');
  }
  LoadEnvironmentAndElementsJobCore.prototype.init = function () {
    if (this.elem.createIntegrationEnvironmentDescriptor) {
      console.error(this.elem.constructor.name, 'has to move createIntegrationEnvironmentDescriptor to actualEnvironmentDescriptor')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'createIntegrationEnvironmentDescriptor is obsolete');
    }
    if (this.elem.lateElementDescriptors) {
      console.error(this.elem.constructor.name, 'has to move lateElementDescriptors to actualElementDescriptors')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'lateElementDescriptors is obsolete');
    }
  };
  LoadEnvironmentAndElementsJobCore.prototype.getEnvironmentDescriptor = function () {
    return this.elem[this.environmentDescriptorMethodName](this.elem.myNameOnMasterEnvironment());
  };
  LoadEnvironmentAndElementsJobCore.prototype.onEnvironmentDescriptor = function (envdesc) {
    this.envDesc = envdesc ? new DescriptorHandler(envdesc) : null;
  };
  LoadEnvironmentAndElementsJobCore.prototype.createEnvironment = function () {
    if (!this.envDesc) {
      return null;
    }
    return this.envDesc.load();
  };
  LoadEnvironmentAndElementsJobCore.prototype.onEnvironment = function (env) {
    this.envAndElements.envLoader = env;
  };
  LoadEnvironmentAndElementsJobCore.prototype.getElementDescriptors = function () {
    return this.elem[this.elementDescriptorsMethodName]();
  };
  LoadEnvironmentAndElementsJobCore.prototype.onElementDescriptors = function (elemdescs) {
    this.elemDescs = elemdescs;
  };
  LoadEnvironmentAndElementsJobCore.prototype.createElements = function () {
    if (!lib.isArray(this.elemDescs)) {
      return [];
    }
    return q.all(this.elemDescs.map(this.createOneElement.bind(this)));
  };
  LoadEnvironmentAndElementsJobCore.prototype.onElements = function (elems) {
    this.envAndElements.elements = elems;
  };
  LoadEnvironmentAndElementsJobCore.prototype.finalize = function () {
    this.elem.loadedEnvironmentAndElements[this.loadedEnvironmentAndElementsPropertyName] = this.envAndElements;
  };

  LoadEnvironmentAndElementsJobCore.prototype.steps = [
    'init',
    'getEnvironmentDescriptor',
    'onEnvironmentDescriptor',
    'createEnvironment',
    'onEnvironment',
    'getElementDescriptors',
    'onElementDescriptors',
    'createElements',
    'onElements',
    'finalize'
  ];
  LoadEnvironmentAndElementsJobCore.prototype.createOneElement = function (elemdesc) {
    var elem = this.elem.createElement(elemdesc), d = q.defer(), ret = d.promise;
    if (elemdesc && elemdesc.options && elemdesc.options.actual) {
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

  function LoadStaticEnvironmentAndElementsJobCore (elem) {
    LoadEnvironmentAndElementsJobCore.call(this, elem);
  }
  lib.inherit(LoadStaticEnvironmentAndElementsJobCore, LoadEnvironmentAndElementsJobCore);
  LoadStaticEnvironmentAndElementsJobCore.prototype.environmentDescriptorMethodName = 'staticEnvironmentDescriptor';
  LoadStaticEnvironmentAndElementsJobCore.prototype.elementDescriptorsMethodName = 'staticElementDescriptors';
  LoadStaticEnvironmentAndElementsJobCore.prototype.loadedEnvironmentAndElementsPropertyName = 'static';
  
  function LoadStaticEnvironmentAndElementsJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadStaticEnvironmentAndElementsJobCore(elem), defer);
  }
  lib.inherit(LoadStaticEnvironmentAndElementsJob, SteppedJobOnSteppedInstance);
  mylib.LoadStaticEnvironmentAndElements = LoadStaticEnvironmentAndElementsJob;

  function LoadActualEnvironmentAndElementsJobCore (elem) {
    LoadEnvironmentAndElementsJobCore.call(this, elem);
  }
  lib.inherit(LoadActualEnvironmentAndElementsJobCore, LoadEnvironmentAndElementsJobCore);
  LoadActualEnvironmentAndElementsJobCore.prototype.environmentDescriptorMethodName = 'actualEnvironmentDescriptor';
  LoadActualEnvironmentAndElementsJobCore.prototype.elementDescriptorsMethodName = 'actualElementDescriptors';
  LoadActualEnvironmentAndElementsJobCore.prototype.loadedEnvironmentAndElementsPropertyName = 'dynamic';

  function LoadActualEnvironmentAndElementsJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadActualEnvironmentAndElementsJobCore(elem), defer);
  }
  lib.inherit(LoadActualEnvironmentAndElementsJob, SteppedJobOnSteppedInstance);
  mylib.LoadActualEnvironmentAndElements = LoadActualEnvironmentAndElementsJob;
}
module.exports = createEnvironmentAndElementsFunctionality;