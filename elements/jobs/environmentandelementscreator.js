function createElementsAndEnvironmentFunctionality (lib, DescriptorHandler, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    SteppedJobOnSteppedInstance = qlib.SteppedJobOnSteppedInstance;

  function ElementsAndEnvironment () {
    this.elements = [];
    this.envLoader = null;
  }
  ElementsAndEnvironment.prototype.destroy = function () {
    if (lib.isArray(this.elements)) {
      lib.arryDestroyAll(this.elements);
    }
    this.elements = null;
    if (this.envLoader) {
      this.envLoader.destroy();
    }
    this.envLoader = null;
  };

  function LoadElementsAndEnvironmentJobCore (elem) {
    this.elem = elem;
    this.elemsAndEnvironment = new ElementsAndEnvironment();
    this.envDesc = null;
    this.elemDescs = null;
  }
  LoadElementsAndEnvironmentJobCore.prototype.destroy = function () {
    this.elemDescs = null;
    this.envDesc = null;
    this.elemsAndEnvironment = null;
    this.elem = null;
  };
  LoadElementsAndEnvironmentJobCore.prototype.shouldContinue = function () {
    if (this.elem && this.elem.destroyed) {
      return;
    }
    return new lib.Error('ELEMENT_DESTROYED', 'No Element to load Environment and Elements on');
  }
  LoadElementsAndEnvironmentJobCore.prototype.init = function () {
    if (this.elem.createIntegrationEnvironmentDescriptor) {
      console.error(this.elem.constructor.name, 'has to move createIntegrationEnvironmentDescriptor to actualEnvironmentDescriptor')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'createIntegrationEnvironmentDescriptor is obsolete');
    }
    if (this.elem.lateElementDescriptors) {
      console.error(this.elem.constructor.name, 'has to move lateElementDescriptors to actualElementDescriptors')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'lateElementDescriptors is obsolete');
    }
  };
  LoadElementsAndEnvironmentJobCore.prototype.getElementDescriptors = function () {
    return this.elem[this.elementDescriptorsMethodName]();
  };
  LoadElementsAndEnvironmentJobCore.prototype.onElementDescriptors = function (elemdescs) {
    this.elemDescs = elemdescs;
  };
  LoadElementsAndEnvironmentJobCore.prototype.createElements = function () {
    if (!lib.isArray(this.elemDescs)) {
      return [];
    }
    return q.all(this.elemDescs.map(this.createOneElement.bind(this)));
  };
  LoadElementsAndEnvironmentJobCore.prototype.onElements = function (elems) {
    this.elemsAndEnvironment.elements = elems;
  };
  LoadElementsAndEnvironmentJobCore.prototype.getEnvironmentDescriptor = function () {
    return this.elem[this.environmentDescriptorMethodName](this.elem.myNameOnMasterEnvironment());
  };
  LoadElementsAndEnvironmentJobCore.prototype.onEnvironmentDescriptor = function (envdesc) {
    this.envDesc = envdesc ? new DescriptorHandler(envdesc) : null;
  };
  LoadElementsAndEnvironmentJobCore.prototype.createEnvironment = function () {
    if (!this.envDesc) {
      return null;
    }
    return this.envDesc.load();
  };
  LoadElementsAndEnvironmentJobCore.prototype.onEnvironment = function (env) {
    this.elemsAndEnvironment.envLoader = env;
  };
  LoadElementsAndEnvironmentJobCore.prototype.finalize = function () {
    this.elem.loadedElementsAndEnvironment[this.loadedElementsAndEnvironmentPropertyName] = this.elemsAndEnvironment;
  };

  LoadElementsAndEnvironmentJobCore.prototype.steps = [
    'init',
    'getElementDescriptors',
    'onElementDescriptors',
    'createElements',
    'onElements',
    'getEnvironmentDescriptor',
    'onEnvironmentDescriptor',
    'createEnvironment',
    'onEnvironment',
    'finalize'
  ];
  LoadElementsAndEnvironmentJobCore.prototype.createOneElement = function (elemdesc) {
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

  function LoadInitialElementsAndEnvironmentJobCore (elem) {
    LoadElementsAndEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadInitialElementsAndEnvironmentJobCore, LoadElementsAndEnvironmentJobCore);
  LoadInitialElementsAndEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'initialEnvironmentDescriptor';
  LoadInitialElementsAndEnvironmentJobCore.prototype.elementDescriptorsMethodName = 'initialElementDescriptors';
  LoadInitialElementsAndEnvironmentJobCore.prototype.loadedElementsAndEnvironmentPropertyName = 'initial';
  
  function LoadInitialElementsAndEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadInitialElementsAndEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadInitialElementsAndEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadInitialElementsAndEnvironment = LoadInitialElementsAndEnvironmentJob;

  function LoadStaticElementsAndEnvironmentJobCore (elem) {
    LoadElementsAndEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadStaticElementsAndEnvironmentJobCore, LoadElementsAndEnvironmentJobCore);
  LoadStaticElementsAndEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'staticEnvironmentDescriptor';
  LoadStaticElementsAndEnvironmentJobCore.prototype.elementDescriptorsMethodName = 'staticElementDescriptors';
  LoadStaticElementsAndEnvironmentJobCore.prototype.loadedElementsAndEnvironmentPropertyName = 'static';
  
  function LoadStaticElementsAndEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadStaticElementsAndEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadStaticElementsAndEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadStaticElementsAndEnvironment = LoadStaticElementsAndEnvironmentJob;

  function LoadActualElementsAndEnvironmentJobCore (elem) {
    LoadElementsAndEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadActualElementsAndEnvironmentJobCore, LoadElementsAndEnvironmentJobCore);
  LoadActualElementsAndEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'actualEnvironmentDescriptor';
  LoadActualElementsAndEnvironmentJobCore.prototype.elementDescriptorsMethodName = 'actualElementDescriptors';
  LoadActualElementsAndEnvironmentJobCore.prototype.loadedElementsAndEnvironmentPropertyName = 'dynamic';

  function LoadActualElementsAndEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadActualElementsAndEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadActualElementsAndEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadActualElementsAndEnvironment = LoadActualElementsAndEnvironmentJob;
}
module.exports = createElementsAndEnvironmentFunctionality;